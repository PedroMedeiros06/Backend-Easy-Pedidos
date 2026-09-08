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
import { itemUnitPrice } from '@/common/pricing/discount';

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  private toCatalogItemResponse(item: any) {
    const links: any[] = item.catalog_item_ingredients ?? [];

    const ingredients = links.map((link: any) => ({
      ingredientId: link.ingredient_id,
      ingredientName: link.ingredients?.ingredient_name ?? null,
      unit: link.ingredients?.unit ?? null,
      role: link.role,
      quantityUsed: link.quantity_used,
      addonPriceCents: link.addon_price_cents,
      removable: link.removable ?? false,
    }));

    // Quantas unidades da receita cheia dá pra montar com o estoque atual.
    // null = item sem ingrediente rastreado. Não expõe estoque cru.
    const includedLinks = links.filter((link) => link.role === 'included');
    const maxQuantity =
      includedLinks.length === 0
        ? null
        : Math.max(
            0,
            Math.min(
              ...includedLinks.map((link) =>
                Math.floor(
                  (link.ingredients?.quantity ?? 0) / (link.quantity_used ?? 1),
                ),
              ),
            ),
          );

    const images = [...((item.catalog_item_images as any[]) ?? [])]
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          String(a.created_at).localeCompare(String(b.created_at)),
      )
      .map((img: any) => ({
        imageId: img.image_id,
        url: img.url,
        sortOrder: img.sort_order,
      }));

    return {
      itemId: item.item_id,
      companyId: item.company_id,
      itemName: item.item_name,
      itemDescription: item.item_description,
      priceCents: item.price_cents,
      categoryId: item.category_id,
      categoryName: item.categories?.category_name ?? null,
      imageUrl: item.image_url,
      images,
      discountValue: item.discount_value,
      discountType: item.discount_type,
      // Desconto da categoria (0/'value' se sem categoria ou sem desconto).
      categoryDiscountValue: item.categories?.discount_value ?? 0,
      categoryDiscountType: item.categories?.discount_type ?? 'value',
      // Preço unitário final já com categoria + item empilhados (sem addons,
      // sem desconto de pedido). É o que o cliente paga por unidade.
      effectivePriceCents: itemUnitPrice(
        item.price_cents,
        item,
        item.categories,
      ),
      active: item.active,
      maxQuantity,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      ingredients: {
        included: ingredients.filter((i: any) => i.role === 'included'),
        addons: ingredients.filter((i: any) => i.role === 'addon'),
      },
    };
  }

  private async syncIngredients(
    itemId: string,
    ingredients: CreateCatalogItemDto['ingredients'],
  ) {
    if (ingredients === undefined) {
      return;
    }

    const { error: deleteError } = await this.supabase.adminClient
      .from('catalog_item_ingredients')
      .delete()
      .eq('item_id', itemId);

    if (deleteError) {
      throw new BadRequestException(
        `Erro ao atualizar ingredientes do item: ${deleteError.message}`,
      );
    }

    if (ingredients.length === 0) {
      return;
    }

    const { error: insertError } = await this.supabase.adminClient
      .from('catalog_item_ingredients')
      .insert(
        ingredients.map((ingredient) => ({
          item_id: itemId,
          ingredient_id: ingredient.ingredientId,
          role: ingredient.role,
          quantity_used: ingredient.quantityUsed ?? 1,
          addon_price_cents:
            ingredient.role === 'addon'
              ? ingredient.addonPriceCents ?? 0
              : null,
          // 'removable' só vale pra included; addon ignora.
          removable:
            ingredient.role === 'included'
              ? ingredient.removable ?? false
              : false,
        })),
      );

    if (insertError) {
      throw new BadRequestException(
        `Erro ao vincular ingredientes ao item: ${insertError.message}`,
      );
    }
  }

  private async findByIdOrThrow(companyId: number, itemId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('catalog_items')
      .select(
        '*, categories(category_name, discount_value, discount_type), catalog_item_images(image_id, url, sort_order, created_at), catalog_item_ingredients(*, ingredients(ingredient_name, unit, quantity))',
      )
      .eq('item_id', itemId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Item não encontrado.');
    }

    return this.toCatalogItemResponse(data);
  }

  async list(companyId: number, query: ListCatalogItemsQueryDto) {
    let builder = this.supabase.adminClient
      .from('catalog_items')
      .select(
        '*, categories(category_name, discount_value, discount_type), catalog_item_images(image_id, url, sort_order, created_at), catalog_item_ingredients(*, ingredients(ingredient_name, unit, quantity))',
      )
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

    await this.syncIngredients(data.item_id, payload.ingredients);

    return this.findByIdOrThrow(companyId, data.item_id);
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

    await this.syncIngredients(itemId, payload.ingredients);

    return this.findByIdOrThrow(companyId, itemId);
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
