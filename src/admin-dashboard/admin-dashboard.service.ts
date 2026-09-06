import { BadRequestException, Injectable } from '@nestjs/common';

import { SupabaseService } from '@/supabase/supabase.service';

// Pedido cancelado não conta como receita nem como venda concluída.
const REVENUE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
];

@Injectable()
export class AdminDashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOverview() {
    const since30d = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [companies, members, orders] = await Promise.all([
      this.supabase.adminClient
        .from('companies')
        .select('blocked'),
      this.supabase.adminClient
        .from('members')
        .select('member_id', { count: 'exact', head: true }),
      this.supabase.adminClient
        .from('orders')
        .select('status, total_cents, created_at'),
    ]);

    if (companies.error) {
      throw new BadRequestException(
        `Erro ao agregar estabelecimentos: ${companies.error.message}`,
      );
    }
    if (members.error) {
      throw new BadRequestException(
        `Erro ao agregar membros: ${members.error.message}`,
      );
    }
    if (orders.error) {
      throw new BadRequestException(
        `Erro ao agregar pedidos: ${orders.error.message}`,
      );
    }

    const companyRows = companies.data ?? [];
    const blocked = companyRows.filter((c: any) => c.blocked).length;

    const orderRows = orders.data ?? [];
    const revenueRows = orderRows.filter((o: any) =>
      REVENUE_STATUSES.includes(o.status),
    );
    const revenueRows30d = revenueRows.filter(
      (o: any) => o.created_at >= since30d,
    );

    const sum = (rows: any[]) =>
      rows.reduce((acc, o) => acc + (o.total_cents ?? 0), 0);

    const revenueCents = sum(revenueRows);
    const ordersCount = revenueRows.length;

    return {
      companies: {
        total: companyRows.length,
        active: companyRows.length - blocked,
        blocked,
      },
      members: {
        total: members.count ?? 0,
      },
      orders: {
        total: ordersCount,
        last30Days: revenueRows30d.length,
        cancelled: orderRows.length - revenueRows.length,
      },
      revenue: {
        totalCents: revenueCents,
        last30DaysCents: sum(revenueRows30d),
        averageTicketCents:
          ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0,
      },
    };
  }
}
