import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import { OrdersService } from '@/orders/orders.service';
import { CreateOrderDto } from '@/orders/dto/orders.dto';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ordersService: OrdersService,
  ) {}

  private async findCompanyByCode(companyCode: string) {
    const { data, error } = await this.supabase.adminClient
      .from('companies')
      .select('company_id, company_code, company_name, company_location, blocked')
      .eq('company_code', companyCode)
      .maybeSingle();

    if (error || !data || data.blocked) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    return data;
  }

  async getStorefront(companyCode: string) {
    const company = await this.findCompanyByCode(companyCode);

    const [{ data: categories }, { data: catalogItems }] = await Promise.all([
      this.supabase.adminClient
        .from('categories')
        .select('category_id, category_name, sort_order')
        .eq('company_id', company.company_id)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      this.supabase.adminClient
        .from('catalog_items')
        .select(
          'item_id, item_name, item_description, price_cents, category_id, image_url, discount_value, discount_type, catalog_item_ingredients(role, addon_price_cents, ingredients(ingredient_id, ingredient_name))',
        )
        .eq('company_id', company.company_id)
        .eq('active', true)
        .order('item_name', { ascending: true }),
    ]);

    return {
      company: {
        companyId: company.company_id,
        companyCode: company.company_code,
        companyName: company.company_name,
        companyLocation: company.company_location,
      },
      categories: (categories ?? []).map((category: any) => ({
        categoryId: category.category_id,
        categoryName: category.category_name,
        sortOrder: category.sort_order,
      })),
      catalogItems: (catalogItems ?? []).map((item: any) => ({
        itemId: item.item_id,
        itemName: item.item_name,
        itemDescription: item.item_description,
        priceCents: item.price_cents,
        categoryId: item.category_id,
        imageUrl: item.image_url,
        discountValue: item.discount_value,
        discountType: item.discount_type,
        // só adicionais aparecem pro cliente — ingrediente incluso é receita interna,
        // e quantidade em estoque nunca é exposta na vitrine pública.
        addons: (item.catalog_item_ingredients ?? [])
          .filter((link: any) => link.role === 'addon')
          .map((link: any) => ({
            ingredientId: link.ingredients?.ingredient_id,
            ingredientName: link.ingredients?.ingredient_name,
            priceCents: link.addon_price_cents ?? 0,
          })),
      })),
    };
  }

  async createOrder(companyCode: string, payload: CreateOrderDto) {
    const company = await this.findCompanyByCode(companyCode);

    return this.ordersService.create(company.company_id, 'storefront', payload);
  }
}
