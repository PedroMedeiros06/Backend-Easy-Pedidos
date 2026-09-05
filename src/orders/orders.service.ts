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
      .select('item_id, item_name, price_cents, discount_value, discount_type, active')
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

      const unitPriceCents = this.applyItemDiscount(
        catalogItem.price_cents,
        catalogItem.discount_value ?? 0,
        catalogItem.discount_type ?? 'value',
      );

      return {
        item_id: catalogItem.item_id,
        item_name: catalogItem.item_name,
        unit_price_cents: unitPriceCents,
        quantity: requested.quantity,
        total_cents: unitPriceCents * requested.quantity,
      };
    });

    return orderItems;
  }

  private async decrementStock(
    companyId: number,
    orderItems: { item_id: string; quantity: number }[],
  ) {
    for (const item of orderItems) {
      const { data: stock } = await this.supabase.adminClient
        .from('stock')
        .select('stock_id, quantity')
        .eq('company_id', companyId)
        .eq('item_id', item.item_id)
        .maybeSingle();

      // Sem registro de estoque pra esse item = não rastreado, não decrementa nada.
      if (!stock) {
        continue;
      }

      const newQuantity = Math.max(stock.quantity - item.quantity, 0);

      await this.supabase.adminClient
        .from('stock')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('stock_id', stock.stock_id);
    }
  }

  async create(
    companyId: number,
    origin: 'pdv' | 'storefront',
    payload: CreateOrderDto,
    createdByMemberId?: string,
  ) {
    const orderItems = await this.buildOrderItems(companyId, payload);

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

    await this.decrementStock(companyId, orderItems);

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
