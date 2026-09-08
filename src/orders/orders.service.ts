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
import { assertTransition, OrderStatus } from './order-status';
import { applyDiscount, itemUnitPrice } from '@/common/pricing/discount';

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
        removed: item.removed_ingredients ?? [],
      })),
    };
  }

  /**
   * Preço unitário do item já com categoria + item empilhados (sem addons).
   * Ver src/common/pricing/discount.ts pra regra completa.
   */
  private itemUnitPriceBeforeAddons(catalogItem: any): number {
    return itemUnitPrice(
      catalogItem.price_cents,
      catalogItem,
      catalogItem.categories,
    );
  }

  private applyOrderDiscount(
    subtotalCents: number,
    discountValue: number,
    discountType: string,
  ): number {
    return applyDiscount(subtotalCents, discountValue, discountType);
  }

  private async buildOrderItems(companyId: number, payload: CreateOrderDto) {
    const itemIds = payload.items.map((item) => item.itemId);

    const { data: catalogItems, error } = await this.supabase.adminClient
      .from('catalog_items')
      .select(
        'item_id, item_name, price_cents, discount_value, discount_type, active, categories(discount_value, discount_type), catalog_item_ingredients(*, ingredients(ingredient_id, ingredient_name, unit, quantity))',
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

    // Consumo por unidade de cada item, por ingrediente — usado só pra dizer
    // "só há estoque para N unidades de <item>" quando o estoque estoura.
    // [{ itemName, ingredientId, perUnit, quantity }]
    const usageByItem: Array<{
      itemName: string;
      ingredientId: string;
      perUnit: number;
      quantity: number;
    }> = [];

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

      // Ingredientes removidos ("sem cebola"): cada id precisa ser um 'included'
      // marcado como 'removable' daquele item.
      const requestedRemovedIds = new Set(requested.removedIngredientIds ?? []);
      const removableIncluded = included.filter((link) => link.removable);
      const removedLinks = removableIncluded.filter((link) =>
        requestedRemovedIds.has(link.ingredient_id),
      );

      const invalidRemovedIds = [...requestedRemovedIds].filter(
        (id) => !removableIncluded.some((link) => link.ingredient_id === id),
      );
      if (invalidRemovedIds.length > 0) {
        throw new BadRequestException(
          `Ingrediente(s) que não podem ser removidos do item "${catalogItem.item_name}": ${invalidRemovedIds.join(', ')}.`,
        );
      }

      const removedIds = new Set(removedLinks.map((link) => link.ingredient_id));

      // soma consumo: inclusos NÃO removidos + adicionais escolhidos, × quantidade do pedido
      const consumedLinks = [
        ...included.filter((link) => !removedIds.has(link.ingredient_id)),
        ...selectedAddons,
      ];
      for (const link of consumedLinks) {
        const perUnit = link.quantity_used ?? 1;
        const used =
          perUnit * requested.quantity +
          (ingredientUsage.get(link.ingredient_id) ?? 0);
        ingredientUsage.set(link.ingredient_id, used);
        usageByItem.push({
          itemName: catalogItem.item_name,
          ingredientId: link.ingredient_id,
          perUnit,
          quantity: requested.quantity,
        });
      }

      const addonPriceCents = selectedAddons.reduce(
        (sum, link) => sum + (link.addon_price_cents ?? 0),
        0,
      );

      const unitPriceCents =
        this.itemUnitPriceBeforeAddons(catalogItem) + addonPriceCents;

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
        removed_ingredients: removedLinks.map((link) => ({
          ingredientId: link.ingredient_id,
          ingredientName: link.ingredients?.ingredient_name ?? null,
        })),
      };
    });

    this.assertIngredientStock(ingredientUsage, catalogItems ?? [], usageByItem);

    return { orderItems, ingredientUsage };
  }

  private assertIngredientStock(
    ingredientUsage: Map<string, number>,
    catalogItems: any[],
    usageByItem: Array<{
      itemName: string;
      ingredientId: string;
      perUnit: number;
      quantity: number;
    }>,
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
        // Acha o item que puxa esse ingrediente e diz quantas unidades dele
        // caberiam no estoque atual (assumindo esse item como o único consumidor).
        const culprit = usageByItem.find(
          (u) => u.ingredientId === ingredientId && u.perUnit > 0,
        );
        if (culprit) {
          const maxUnits = Math.floor(ingredient.quantity / culprit.perUnit);
          throw new BadRequestException(
            `Só há estoque para ${maxUnits} unidade(s) de "${culprit.itemName}" (ingrediente "${ingredient.name}").`,
          );
        }
        throw new BadRequestException(
          `Estoque insuficiente de "${ingredient.name}" para este pedido.`,
        );
      }
    }
  }

  private async decrementIngredients(
    ingredientUsage: Map<string, number>,
  ) {
    await this.adjustIngredients(ingredientUsage, -1);
  }

  // sign = -1 decrementa (venda), +1 devolve (estorno de cancelamento).
  private async adjustIngredients(
    ingredientUsage: Map<string, number>,
    sign: 1 | -1,
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

      const newQuantity = Math.max(ingredient.quantity + sign * used, 0);

      await this.supabase.adminClient
        .from('ingredients')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('ingredient_id', ingredientId);
    }
  }

  // Re-deriva o consumo de ingredientes de um pedido a partir dos order_items
  // e da receita ATUAL de cada catalog_item (mesma lógica de buildOrderItems).
  // Se a receita mudou entre criar e cancelar, o estorno reflete a receita atual
  // — order_items não guarda snapshot de consumo.
  private async computeOrderIngredientUsage(
    order: any,
  ): Promise<Map<string, number>> {
    const usage = new Map<string, number>();
    const items: any[] = order.order_items ?? [];
    const itemIds = [
      ...new Set(items.map((i) => i.item_id).filter(Boolean)),
    ];

    if (itemIds.length === 0) {
      return usage;
    }

    const { data: catalogItems } = await this.supabase.adminClient
      .from('catalog_items')
      .select(
        'item_id, catalog_item_ingredients(role, ingredient_id, quantity_used)',
      )
      .eq('company_id', order.company_id)
      .in('item_id', itemIds);

    const catalogMap = new Map(
      (catalogItems ?? []).map((c: any) => [c.item_id, c]),
    );

    for (const item of items) {
      const catalogItem = catalogMap.get(item.item_id);
      if (!catalogItem) {
        continue;
      }

      const links: any[] = catalogItem.catalog_item_ingredients ?? [];

      // Ingredientes que foram removidos deste item no pedido ("sem cebola")
      // não foram consumidos, então não entram no estorno.
      const removedIds = new Set(
        (item.removed_ingredients ?? []).map((r: any) => r.ingredientId),
      );
      const included = links.filter(
        (l) => l.role === 'included' && !removedIds.has(l.ingredient_id),
      );

      const addonIds = new Set(
        (item.addons ?? []).map((a: any) => a.ingredientId),
      );
      const selectedAddons = links.filter(
        (l) => l.role === 'addon' && addonIds.has(l.ingredient_id),
      );

      for (const link of [...included, ...selectedAddons]) {
        const prev = usage.get(link.ingredient_id) ?? 0;
        usage.set(
          link.ingredient_id,
          prev + (link.quantity_used ?? 1) * item.quantity,
        );
      }
    }

    return usage;
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
    const { data: current, error: fetchError } = await this.supabase.adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_id', orderId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchError) {
      throw new BadRequestException(
        `Erro ao carregar pedido: ${fetchError.message}`,
      );
    }
    if (!current) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    const from = current.status as OrderStatus;
    const to = payload.status as OrderStatus;

    if (from === to) {
      return this.findById(companyId, orderId);
    }

    assertTransition(from, to);

    const { error } = await this.supabase.adminClient
      .from('orders')
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('company_id', companyId);

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar status do pedido: ${error.message}`,
      );
    }

    // Estorno de estoque: só ao entrar em 'cancelled' vindo de um status
    // que já havia decrementado ingredientes (qualquer não-terminal).
    // 'from === cancelled' é barrado acima pela máquina de estados, então
    // não há risco de estornar duas vezes.
    if (to === 'cancelled') {
      const usage = await this.computeOrderIngredientUsage(current);
      await this.adjustIngredients(usage, 1);
    }

    return this.findById(companyId, orderId);
  }
}
