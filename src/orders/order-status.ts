import { BadRequestException } from '@nestjs/common';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

// Fluxo linear: cada status só avança pro próximo da fila.
// 'cancelled' é alcançável de qualquer status não-terminal.
// 'completed' e 'cancelled' são terminais (nenhuma transição sai deles).
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) {
    return true;
  }
  return (STATUS_FLOW[from] ?? []).includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Transição de status inválida: "${from}" → "${to}".`,
    );
  }
}
