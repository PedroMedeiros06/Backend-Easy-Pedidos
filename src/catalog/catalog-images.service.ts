import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { SupabaseService } from '@/supabase/supabase.service';

/**
 * Gestão das fotos de um item do cardápio.
 *
 * Regras:
 * - Máx {@link CatalogImagesService.MAX_IMAGES} fotos por item.
 * - Upload cru é limitado a {@link CatalogImagesService.MAX_UPLOAD_BYTES};
 *   depois é sempre recomprimido pra webp (lado maior {@link CatalogImagesService.MAX_DIMENSION}px,
 *   qualidade {@link CatalogImagesService.WEBP_QUALITY}) antes de ir pro Storage,
 *   então o que fica hospedado costuma ser bem menor.
 * - Bucket público `catalog-images`, path `{companyId}/{itemId}/{uuid}.webp`.
 * - `catalog_items.image_url` espelha a foto de menor `sort_order` (retrocompat
 *   com a vitrine e telas que ainda leem um campo único). É re-sincronizado
 *   depois de qualquer add/remove/reorder.
 */
@Injectable()
export class CatalogImagesService {
  static readonly MAX_IMAGES = 4;
  static readonly MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  static readonly MAX_DIMENSION = 1200;
  static readonly WEBP_QUALITY = 80;
  private static readonly BUCKET = 'catalog-images';
  private static readonly ACCEPTED_MIME = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor(private readonly supabase: SupabaseService) {}

  private toImageResponse(row: any) {
    return {
      imageId: row.image_id,
      url: row.url,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    };
  }

  /** Garante que o item existe e pertence à empresa do usuário logado. */
  private async assertItemOwnership(companyId: number, itemId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('catalog_items')
      .select('item_id')
      .eq('item_id', itemId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao validar o item: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Item não encontrado.');
    }
  }

  private async listRows(itemId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('catalog_item_images')
      .select('*')
      .eq('item_id', itemId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Erro ao listar as fotos do item: ${error.message}`,
      );
    }
    return data ?? [];
  }

  /**
   * Recarrega as fotos (já ordenadas), reescreve `sort_order` como 0..N-1
   * caso tenha buracos e atualiza `catalog_items.image_url` com a primeira.
   */
  private async normalizeAndSyncCover(itemId: string) {
    const rows = await this.listRows(itemId);

    const needsRenumber = rows.some(
      (row: any, index: number) => row.sort_order !== index,
    );
    if (needsRenumber) {
      await Promise.all(
        rows.map((row: any, index: number) =>
          this.supabase.adminClient
            .from('catalog_item_images')
            .update({ sort_order: index })
            .eq('image_id', row.image_id),
        ),
      );
    }

    const coverUrl = rows.length > 0 ? rows[0].url : null;
    await this.supabase.adminClient
      .from('catalog_items')
      .update({ image_url: coverUrl, updated_at: new Date().toISOString() })
      .eq('item_id', itemId);

    return rows.map((row: any, index: number) =>
      this.toImageResponse({ ...row, sort_order: needsRenumber ? index : row.sort_order }),
    );
  }

  async list(companyId: number, itemId: string) {
    await this.assertItemOwnership(companyId, itemId);
    const rows = await this.listRows(itemId);
    return rows.map((row: any) => this.toImageResponse(row));
  }

  async add(
    companyId: number,
    itemId: string,
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    await this.assertItemOwnership(companyId, itemId);

    if (!file) {
      throw new BadRequestException('Envie um arquivo de imagem no campo "file".');
    }
    if (!CatalogImagesService.ACCEPTED_MIME.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Formato inválido. Envie uma imagem JPEG, PNG ou WebP.',
      );
    }
    if (file.size > CatalogImagesService.MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(
        'A imagem excede o limite de 5 MB. Envie um arquivo menor.',
      );
    }

    const existing = await this.listRows(itemId);
    if (existing.length >= CatalogImagesService.MAX_IMAGES) {
      throw new BadRequestException(
        `Cada item pode ter no máximo ${CatalogImagesService.MAX_IMAGES} fotos. Remova uma antes de adicionar outra.`,
      );
    }

    let webp: Buffer;
    try {
      webp = await sharp(file.buffer)
        .rotate()
        .resize(
          CatalogImagesService.MAX_DIMENSION,
          CatalogImagesService.MAX_DIMENSION,
          { fit: 'inside', withoutEnlargement: true },
        )
        .webp({ quality: CatalogImagesService.WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Não foi possível processar a imagem enviada.',
      );
    }

    const storagePath = `${companyId}/${itemId}/${randomUUID()}.webp`;

    const { error: uploadError } = await this.supabase.adminClient.storage
      .from(CatalogImagesService.BUCKET)
      .upload(storagePath, webp, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `Erro ao enviar a imagem: ${uploadError.message}`,
      );
    }

    const { data: publicUrl } = this.supabase.adminClient.storage
      .from(CatalogImagesService.BUCKET)
      .getPublicUrl(storagePath);

    const { data: inserted, error: insertError } = await this.supabase.adminClient
      .from('catalog_item_images')
      .insert({
        item_id: itemId,
        company_id: companyId,
        url: publicUrl.publicUrl,
        storage_path: storagePath,
        sort_order: existing.length,
      })
      .select()
      .single();

    if (insertError) {
      // rollback do objeto no Storage pra não deixar lixo órfão
      await this.supabase.adminClient.storage
        .from(CatalogImagesService.BUCKET)
        .remove([storagePath]);
      throw new BadRequestException(
        `Erro ao registrar a imagem: ${insertError.message}`,
      );
    }

    await this.normalizeAndSyncCover(itemId);

    return {
      image: this.toImageResponse(inserted),
      images: await this.listImagesForItem(itemId),
    };
  }

  async remove(companyId: number, itemId: string, imageId: string) {
    await this.assertItemOwnership(companyId, itemId);

    const { data: row, error } = await this.supabase.adminClient
      .from('catalog_item_images')
      .select('*')
      .eq('image_id', imageId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao buscar a imagem: ${error.message}`,
      );
    }
    if (!row) {
      throw new NotFoundException('Imagem não encontrada.');
    }

    const { error: deleteError } = await this.supabase.adminClient
      .from('catalog_item_images')
      .delete()
      .eq('image_id', imageId);

    if (deleteError) {
      throw new BadRequestException(
        `Erro ao remover a imagem: ${deleteError.message}`,
      );
    }

    // Best-effort: se o objeto não sair do Storage, o registro já foi embora;
    // não vale quebrar o request por causa disso.
    await this.supabase.adminClient.storage
      .from(CatalogImagesService.BUCKET)
      .remove([row.storage_path]);

    const images = await this.normalizeAndSyncCover(itemId);
    return { message: 'Imagem removida com sucesso.', images };
  }

  async reorder(companyId: number, itemId: string, imageIds: string[]) {
    await this.assertItemOwnership(companyId, itemId);

    const rows = await this.listRows(itemId);
    const currentIds = rows.map((row: any) => row.image_id);

    const sameSet =
      currentIds.length === imageIds.length &&
      [...currentIds].sort().join(',') === [...imageIds].sort().join(',');

    if (!sameSet) {
      throw new BadRequestException(
        'A lista de imagens não corresponde às fotos atuais do item.',
      );
    }

    await Promise.all(
      imageIds.map((imageId, index) =>
        this.supabase.adminClient
          .from('catalog_item_images')
          .update({ sort_order: index })
          .eq('image_id', imageId),
      ),
    );

    const images = await this.normalizeAndSyncCover(itemId);
    return { images };
  }

  /** Usado internamente e pelo retorno de add/remove/reorder. */
  private async listImagesForItem(itemId: string) {
    const rows = await this.listRows(itemId);
    return rows.map((row: any) => this.toImageResponse(row));
  }
}
