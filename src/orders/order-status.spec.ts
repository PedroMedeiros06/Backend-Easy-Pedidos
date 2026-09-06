import { BadRequestException } from '@nestjs/common';

import {
  assertTransition,
  canTransition,
  OrderStatus,
  STATUS_FLOW,
} from './order-status';

describe('order-status state machine', () => {
  const ALL: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled',
  ];

  it('avança linearmente pelo fluxo feliz', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'preparing')).toBe(true);
    expect(canTransition('preparing', 'ready')).toBe(true);
    expect(canTransition('ready', 'completed')).toBe(true);
  });

  it('não deixa pular etapas pra frente', () => {
    expect(canTransition('pending', 'preparing')).toBe(false);
    expect(canTransition('pending', 'ready')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('confirmed', 'ready')).toBe(false);
  });

  it('não deixa voltar status', () => {
    expect(canTransition('confirmed', 'pending')).toBe(false);
    expect(canTransition('ready', 'preparing')).toBe(false);
    expect(canTransition('completed', 'ready')).toBe(false);
  });

  it('permite cancelar de qualquer status não-terminal', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('preparing', 'cancelled')).toBe(true);
    expect(canTransition('ready', 'cancelled')).toBe(true);
  });

  it('trata completed e cancelled como terminais', () => {
    for (const to of ALL) {
      if (to === 'completed') continue;
      expect(canTransition('completed', to)).toBe(false);
    }
    for (const to of ALL) {
      if (to === 'cancelled') continue;
      expect(canTransition('cancelled', to)).toBe(false);
    }
    expect(STATUS_FLOW.completed).toEqual([]);
    expect(STATUS_FLOW.cancelled).toEqual([]);
  });

  it('trata mesmo-status como no-op permitido', () => {
    for (const s of ALL) {
      expect(canTransition(s, s)).toBe(true);
    }
  });

  it('assertTransition lança BadRequest em transição inválida', () => {
    expect(() => assertTransition('pending', 'completed')).toThrow(
      BadRequestException,
    );
    expect(() => assertTransition('cancelled', 'pending')).toThrow(
      BadRequestException,
    );
  });

  it('assertTransition não lança em transição válida', () => {
    expect(() => assertTransition('pending', 'confirmed')).not.toThrow();
    expect(() => assertTransition('ready', 'cancelled')).not.toThrow();
  });
});
