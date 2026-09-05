import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  CreateCatalogItemDto,
  ListCatalogItemsQueryDto,
  UpdateCatalogItemDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  private toCatalogItemResponse(item: any) {
    return {
      itemId: item.item_id,
      companyId: item.company_id,
      itemName: item.item_name,
      itemDescription: item.item_description,
      priceCents: item.price_cents,
      categoryId: item.category_id,
      categoryName: item.categories?.category_name ?? null,
      imageUrl: item.image_url,
      discountValue: item.discount_value,
      discountType: item.discount_type,
      active: item.active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  async list(companyId: number, query: ListCatalogItemsQueryDto) {
    let builder = this.supabase.adminClient
      .from('catalog_items')
      .select('*, categories(category_name)')
      .eq('company_id', companyId)
      .order('item_name', { ascending: true })
      .limit(query.limit ?? 50);

    if (query.categoryId) {
      builder = builder.eq('category_id', query.categoryId);
    }

    const { data, error } = await builder;

    if (error) {
      throw new BadRequestException(
        `Erro ao listar itens do cardápio: ${error.message}`,
      );
    }

    return (data ?? []).map((item: any) => this.toCatalogItemResponse(item));
  }

  async create(companyId: number, payload: CreateCatalogItemDto) {
    const { data: company, error: planError } = await this.supabase.adminClient
      .from('companies')
      .select('plans(max_catalog_items)')
      .eq('company_id', companyId)
      .single();

    if (planError || !company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const maxItems = (company as any).plans?.max_catalog_items ?? 0;

    const { count, error: countError } = await this.supabase.adminClient
      .from('catalog_items')
      .select('item_id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (countError) {
      throw new BadRequestException(
        `Erro ao validar limite do plano: ${countError.message}`,
      );
    }

    if (maxItems && (count ?? 0) >= maxItems) {
      throw new BadRequestException(
        `O plano atual permite no máximo ${maxItems} item(ns) no cardápio. Faça upgrade para adicionar mais.`,
      );
    }

    if (payload.discountType === 'percentage' && (payload.discountValue ?? 0) > 100) {
      throw new BadRequestException(
        'O desconto percentual não pode ser maior que 100.',
      );
    }

    const { data, error } = await this.supabase.adminClient
      .from('catalog_items')
      .insert({
        company_id: companyId,
        item_name: payload.itemName,
        item_description: payload.itemDescription,
        price_cents: payload.priceCents,
        category_id: payload.categoryId,
        image_url: payload.imageUrl,
        discount_value: payload.discountValue ?? 0,
        discount_type: payload.discountType ?? 'value',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao criar item: ${error.message}`);
    }

    return this.toCatalogItemResponse(data);
  }

  async update(
    companyId: number,
    itemId: string,
    payload: UpdateCatalogItemDto,
  ) {
    if (payload.discountType === 'percentage' && (payload.discountValue ?? 0) > 100) {
      throw new BadRequestException(
        'O desconto percentual não pode ser maior que 100.',
      );
    }

    const { data, error } = await this.supabase.adminClient
      .from('catalog_items')
      .update({
        item_name: payload.itemName,
        item_description: payload.itemDescription,
        price_cents: payload.priceCents,
        category_id: payload.categoryId,
        image_url: payload.imageUrl,
        discount_value: payload.discountValue,
        discount_type: payload.discountType,
        active: payload.active,
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', itemId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Erro ao atualizar item: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('Item não encontrado.');
    }

    return this.toCatalogItemResponse(data);
  }

  async remove(companyId: number, itemId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('catalog_items')
      .delete()
      .eq('item_id', itemId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Erro ao remover item: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('Item não encontrado.');
    }

    return { message: 'Item removido com sucesso.' };
  }
}
