import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly supabase: SupabaseService) {}

  private toOrderResponse(order: any) {
    return {
      orderId: order.order_id,
      companyId: order.company_id,
      origin: order.origin,
      status: order.status,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      paymentMethod: order.payment_method,
      discountValue: order.discount_value,
      discountType: order.discount_type,
      subtotalCents: order.subtotal_cents,
      totalCents: order.total_cents,
      notes: order.notes,
      createdByMemberId: order.created_by_member_id,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: (order.order_items ?? []).map((item: any) => ({
        orderItemId: item.order_item_id,
        itemId: item.item_id,
        itemName: item.item_name,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
        totalCents: item.total_cents,
        addons: item.addons ?? [],
      })),
    };
  }

  private applyItemDiscount(
    priceCents: number,
    discountValue: number,
    discountType: string,
  ): number {
    const discount =
      discountType === 'percentage'
        ? Math.round(priceCents * (Math.min(discountValue, 100) / 100))
        : discountValue;

    return Math.max(priceCents - discount, 0);
  }

  private applyOrderDiscount(
    subtotalCents: number,
    discountValue: number,
    discountType: string,
  ): number {
    const discount =
      discountType === 'percentage'
        ? Math.round(subtotalCents * (Math.min(discountValue, 100) / 100))
        : discountValue;

    return Math.max(subtotalCents - discount, 0);
  }

  private async buildOrderItems(companyId: number, payload: CreateOrderDto) {
    const itemIds = payload.items.map((item) => item.itemId);

    const { data: catalogItems, error } = await this.supabase.adminClient
      .from('catalog_items')
      .select(
        'item_id, item_name, price_cents, discount_value, discount_type, active, catalog_item_ingredients(*, ingredients(ingredient_id, ingredient_name, unit, quantity))',
      )
      .eq('company_id', companyId)
      .in('item_id', itemIds);

    if (error) {
      throw new BadRequestException(
        `Erro ao validar itens do pedido: ${error.message}`,
      );
    }

    const catalogMap = new Map(
      (catalogItems ?? []).map((item: any) => [item.item_id, item]),
    );

    // Acumula consumo total por ingrediente pra validar estoque de uma vez,
    // considerando o pedido inteiro (não só linha por linha).
    const ingredientUsage = new Map<string, number>();

    const orderItems = payload.items.map((requested) => {
      const catalogItem = catalogMap.get(requested.itemId);

      if (!catalogItem) {
        throw new BadRequestException(
          `Item ${requested.itemId} não encontrado no cardápio desta empresa.`,
        );
      }

      if (!catalogItem.active) {
        throw new BadRequestException(
          `Item "${catalogItem.item_name}" não está disponível no momento.`,
        );
      }

      const links: any[] = catalogItem.catalog_item_ingredients ?? [];
      const included = links.filter((link) => link.role === 'included');

      const requestedAddonIds = new Set(requested.addonIngredientIds ?? []);
      const availableAddons = links.filter((link) => link.role === 'addon');
      const selectedAddons = availableAddons.filter((link) =>
        requestedAddonIds.has(link.ingredient_id),
      );

      const invalidAddonIds = [...requestedAddonIds].filter(
        (id) => !availableAddons.some((link) => link.ingredient_id === id),
      );
      if (invalidAddonIds.length > 0) {
        throw new BadRequestException(
          `Adicional(is) inválido(s) para o item "${catalogItem.item_name}": ${invalidAddonIds.join(', ')}.`,
        );
      }

      // soma consumo: ingredientes inclusos + adicionais escolhidos, multiplicado pela quantidade do pedido
      for (const link of [...included, ...selectedAddons]) {
        const used =
          (link.quantity_used ?? 1) * requested.quantity +
          (ingredientUsage.get(link.ingredient_id) ?? 0);
        ingredientUsage.set(link.ingredient_id, used);
      }

      const addonPriceCents = selectedAddons.reduce(
        (sum, link) => sum + (link.addon_price_cents ?? 0),
        0,
      );

      const unitPriceCents =
        this.applyItemDiscount(
          catalogItem.price_cents,
          catalogItem.discount_value ?? 0,
          catalogItem.discount_type ?? 'value',
        ) + addonPriceCents;

      return {
        item_id: catalogItem.item_id,
        item_name: catalogItem.item_name,
        unit_price_cents: unitPriceCents,
        quantity: requested.quantity,
        total_cents: unitPriceCents * requested.quantity,
        addons: selectedAddons.map((link) => ({
          ingredientId: link.ingredient_id,
          ingredientName: link.ingredients?.ingredient_name ?? null,
          priceCents: link.addon_price_cents ?? 0,
        })),
      };
    });

    await this.assertIngredientStock(ingredientUsage, catalogItems ?? []);

    return { orderItems, ingredientUsage };
  }

  private async assertIngredientStock(
    ingredientUsage: Map<string, number>,
    catalogItems: any[],
  ) {
    if (ingredientUsage.size === 0) {
      return;
    }

    // Monta um mapa ingredientId -> {name, quantity} a partir do que já veio na query de itens.
    const ingredientMap = new Map<string, { name: string; quantity: number }>();
    for (const item of catalogItems) {
      for (const link of item.catalog_item_ingredients ?? []) {
        if (link.ingredients) {
          ingredientMap.set(link.ingredient_id, {
            name: link.ingredients.ingredient_name,
            quantity: link.ingredients.quantity,
          });
        }
      }
    }

    for (const [ingredientId, used] of ingredientUsage) {
      const ingredient = ingredientMap.get(ingredientId);
      if (!ingredient) {
        continue;
      }
      if (ingredient.quantity < used) {
        throw new BadRequestException(
          `Estoque insuficiente de "${ingredient.name}" para este pedido.`,
        );
      }
    }
  }

  private async decrementIngredients(
    ingredientUsage: Map<string, number>,
  ) {
    for (const [ingredientId, used] of ingredientUsage) {
      const { data: ingredient } = await this.supabase.adminClient
        .from('ingredients')
        .select('quantity')
        .eq('ingredient_id', ingredientId)
        .maybeSingle();

      if (!ingredient) {
        continue;
      }

      const newQuantity = Math.max(ingredient.quantity - used, 0);

      await this.supabase.adminClient
        .from('ingredients')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('ingredient_id', ingredientId);
    }
  }

  async create(
    companyId: number,
    origin: 'pdv' | 'storefront',
    payload: CreateOrderDto,
    createdByMemberId?: string,
  ) {
    const { orderItems, ingredientUsage } = await this.buildOrderItems(
      companyId,
      payload,
    );

    const subtotalCents = orderItems.reduce(
      (sum, item) => sum + item.total_cents,
      0,
    );

    if (payload.discountType === 'percentage' && (payload.discountValue ?? 0) > 100) {
      throw new BadRequestException(
        'O desconto percentual não pode ser maior que 100.',
      );
    }

    const totalCents = this.applyOrderDiscount(
      subtotalCents,
      payload.discountValue ?? 0,
      payload.discountType ?? 'value',
    );

    const { data: order, error: orderError } = await this.supabase.adminClient
      .from('orders')
      .insert({
        company_id: companyId,
        origin,
        customer_name: payload.customerName,
        customer_phone: payload.customerPhone,
        payment_method: payload.paymentMethod,
        discount_value: payload.discountValue ?? 0,
        discount_type: payload.discountType ?? 'value',
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
        notes: payload.notes,
        created_by_member_id: createdByMemberId ?? null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new BadRequestException(
        `Erro ao criar pedido: ${orderError?.message}`,
      );
    }

    const { error: itemsError } = await this.supabase.adminClient
      .from('order_items')
      .insert(
        orderItems.map((item) => ({ ...item, order_id: order.order_id })),
      );

    if (itemsError) {
      await this.supabase.adminClient
        .from('orders')
        .delete()
        .eq('order_id', order.order_id);
      throw new BadRequestException(
        `Erro ao registrar itens do pedido: ${itemsError.message}`,
      );
    }

    await this.decrementIngredients(ingredientUsage);

    return this.findById(companyId, order.order_id);
  }

  async list(companyId: number, query: ListOrdersQueryDto) {
    let builder = this.supabase.adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(query.limit ?? 50);

    if (query.origin) {
      builder = builder.eq('origin', query.origin);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    const { data, error } = await builder;

    if (error) {
      throw new BadRequestException(`Erro ao listar pedidos: ${error.message}`);
    }

    return (data ?? []).map((order: any) => this.toOrderResponse(order));
  }

  async findById(companyId: number, orderId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('company_id', companyId)
      .eq('order_id', orderId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return this.toOrderResponse(data);
  }

  async updateStatus(
    companyId: number,
    orderId: string,
    payload: UpdateOrderStatusDto,
  ) {
    const { data, error } = await this.supabase.adminClient
      .from('orders')
      .update({ status: payload.status, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar status do pedido: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return this.findById(companyId, orderId);
  }
}
