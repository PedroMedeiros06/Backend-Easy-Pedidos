import { applyDiscount, itemUnitPrice } from './discount';

describe('applyDiscount', () => {
  it('subtrai valor fixo em centavos', () => {
    expect(applyDiscount(1000, 150, 'value')).toBe(850);
  });

  it('aplica percentual arredondando', () => {
    expect(applyDiscount(1000, 10, 'percentage')).toBe(900);
    expect(applyDiscount(999, 10, 'percentage')).toBe(899); // 99.9 -> 100
  });

  it('satura em 0, nunca negativo', () => {
    expect(applyDiscount(500, 800, 'value')).toBe(0);
  });

  it('percentual > 100 é tratado como 100', () => {
    expect(applyDiscount(1000, 150, 'percentage')).toBe(0);
  });

  it('sem desconto devolve a base', () => {
    expect(applyDiscount(1000, 0, 'value')).toBe(1000);
    expect(applyDiscount(1000, null, undefined)).toBe(1000);
  });
});

describe('itemUnitPrice — categoria + item empilham', () => {
  it('só desconto de item quando não há categoria', () => {
    expect(
      itemUnitPrice(1000, { discountValue: 10, discountType: 'percentage' }, null),
    ).toBe(900);
  });

  it('só desconto de categoria quando o item não tem', () => {
    expect(
      itemUnitPrice(
        1000,
        { discountValue: 0, discountType: 'value' },
        { discountValue: 200, discountType: 'value' },
      ),
    ).toBe(800);
  });

  it('percentuais compõem multiplicativo (10% cat + 10% item = 19% off)', () => {
    // 1000 -> 900 (cat) -> 810 (item)
    expect(
      itemUnitPrice(
        1000,
        { discountValue: 10, discountType: 'percentage' },
        { discountValue: 10, discountType: 'percentage' },
      ),
    ).toBe(810);
  });

  it('categoria primeiro, depois item — ordem importa com valor fixo', () => {
    // 1000 -> 900 (cat -100) -> 810 (item -10%)
    expect(
      itemUnitPrice(
        1000,
        { discountValue: 10, discountType: 'percentage' },
        { discountValue: 100, discountType: 'value' },
      ),
    ).toBe(810);
  });

  it('empilhamento pode zerar o preço', () => {
    expect(
      itemUnitPrice(
        1000,
        { discountValue: 600, discountType: 'value' },
        { discountValue: 600, discountType: 'value' },
      ),
    ).toBe(0);
  });

  it('aceita snake_case (linha crua do supabase)', () => {
    expect(
      itemUnitPrice(
        1000,
        { discount_value: 10, discount_type: 'percentage' } as any,
        { discount_value: 10, discount_type: 'percentage' } as any,
      ),
    ).toBe(810);
  });
});
