/**
 * Regra de desconto do MesaFlow — descontos EMPILHAM (2026-09-08).
 *
 * Ordem sobre o preço unitário do item (sem addons):
 *   1. desconto da CATEGORIA sobre o preço cheio
 *   2. desconto do ITEM sobre o resultado
 * Percentuais compõem multiplicativo: 10% categoria + 10% item = 19% off, não 20%.
 * Valor fixo (`value`) subtrai em centavos. Cada etapa satura em 0.
 *
 * O desconto do PEDIDO (`orders.discount_*`) é aplicado depois, sobre o subtotal
 * já com addons — ver OrdersService.applyOrderDiscount.
 */

export type DiscountType = 'value' | 'percentage';

export interface DiscountInput {
  discountValue?: number | null;
  discountType?: string | null;
}

/** Aplica um único desconto sobre `baseCents`, saturando em 0. */
export function applyDiscount(
  baseCents: number,
  discountValue: number | null | undefined,
  discountType: string | null | undefined,
): number {
  const value = discountValue ?? 0;
  const discount =
    discountType === 'percentage'
      ? Math.round(baseCents * (Math.min(value, 100) / 100))
      : value;
  return Math.max(baseCents - discount, 0);
}

/**
 * Preço unitário do item já com categoria + item empilhados (sem addons).
 * `category` pode ser null/undefined (item sem categoria = sem esse desconto).
 */
export function itemUnitPrice(
  priceCents: number,
  item: DiscountInput,
  category: DiscountInput | null | undefined,
): number {
  const afterCategory = applyDiscount(
    priceCents,
    category?.discountValue ?? (category as any)?.discount_value,
    category?.discountType ?? (category as any)?.discount_type,
  );
  return applyDiscount(
    afterCategory,
    item.discountValue ?? (item as any).discount_value,
    item.discountType ?? (item as any).discount_type,
  );
}
