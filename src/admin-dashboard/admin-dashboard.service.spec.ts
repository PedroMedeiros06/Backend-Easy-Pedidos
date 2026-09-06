import { AdminDashboardService } from './admin-dashboard.service';

// Stub do SupabaseService: cada .from(tabela) devolve um thenable que
// resolve com as linhas configuradas, imitando a API do supabase-js
// (select().eq()... e select(_, { head, count })).
function makeSupabaseStub(rows: {
  companies: any[];
  membersCount: number;
  orders: any[];
}) {
  return {
    adminClient: {
      from(table: string) {
        const result =
          table === 'companies'
            ? { data: rows.companies, error: null }
            : table === 'members'
              ? { data: null, count: rows.membersCount, error: null }
              : { data: rows.orders, error: null };
        // select() retorna algo que é await-ável e também encadeável
        const chainable: any = {
          select: () => chainable,
          eq: () => chainable,
          then: (resolve: any) => resolve(result),
        };
        return chainable;
      },
    },
  };
}

describe('AdminDashboardService.getOverview', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const recent = new Date(Date.now() - 5 * DAY).toISOString();
  const old = new Date(Date.now() - 40 * DAY).toISOString();

  it('agrega contadores, receita e ticket médio ignorando cancelados', async () => {
    const supabase = makeSupabaseStub({
      companies: [
        { blocked: false },
        { blocked: false },
        { blocked: true },
      ],
      membersCount: 7,
      orders: [
        { status: 'completed', total_cents: 1000, created_at: recent },
        { status: 'ready', total_cents: 500, created_at: recent },
        { status: 'completed', total_cents: 2000, created_at: old },
        { status: 'cancelled', total_cents: 9999, created_at: recent },
      ],
    });

    const service = new AdminDashboardService(supabase as any);
    const overview = await service.getOverview();

    expect(overview.companies).toEqual({ total: 3, active: 2, blocked: 1 });
    expect(overview.members).toEqual({ total: 7 });

    // 3 pedidos contam como receita (completed/ready/completed), 1 cancelado fora
    expect(overview.orders.total).toBe(3);
    expect(overview.orders.cancelled).toBe(1);
    // só os 2 recentes não-cancelados entram na janela de 30d
    expect(overview.orders.last30Days).toBe(2);

    // receita total = 1000 + 500 + 2000 = 3500
    expect(overview.revenue.totalCents).toBe(3500);
    // 30d = 1000 + 500 = 1500
    expect(overview.revenue.last30DaysCents).toBe(1500);
    // ticket médio = round(3500 / 3) = 1167
    expect(overview.revenue.averageTicketCents).toBe(1167);
  });

  it('não divide por zero quando não há pedidos', async () => {
    const supabase = makeSupabaseStub({
      companies: [],
      membersCount: 0,
      orders: [],
    });

    const service = new AdminDashboardService(supabase as any);
    const overview = await service.getOverview();

    expect(overview.revenue.averageTicketCents).toBe(0);
    expect(overview.orders.total).toBe(0);
    expect(overview.companies).toEqual({ total: 0, active: 0, blocked: 0 });
  });
});
