import { AdminHealthService } from './admin-health.service';

// Stub do SupabaseService. `failTables` = tabelas cujo SELECT deve falhar;
// `failAuth` = listUsers deve falhar.
function makeSupabaseStub(opts: {
  failTables?: string[];
  failAuth?: boolean;
} = {}) {
  const failTables = new Set(opts.failTables ?? []);
  return {
    adminClient: {
      from(table: string) {
        const result = failTables.has(table)
          ? { error: { message: `tabela ${table} indisponível` } }
          : { error: null };
        const chainable: any = {
          select: () => chainable,
          then: (resolve: any) => resolve(result),
        };
        return chainable;
      },
      auth: {
        admin: {
          listUsers: async () =>
            opts.failAuth
              ? { data: null, error: { message: 'auth fora do ar' } }
              : { data: { users: [] }, error: null },
        },
      },
    },
  };
}

describe('AdminHealthService.getHealth', () => {
  it('reporta status up quando todas as checagens passam', async () => {
    const service = new AdminHealthService(makeSupabaseStub() as any);
    const report = await service.getHealth();

    expect(report.status).toBe('up');
    expect(report.checkedAt).toEqual(expect.any(String));

    const names = report.checks.map((c) => c.service);
    expect(names).toEqual([
      'API',
      'Supabase DB',
      'Supabase Auth',
      'Login',
      'Orders',
      'Catalog',
    ]);

    for (const check of report.checks) {
      expect(check.status).toBe('up');
      expect(check.latencyMs).toBeGreaterThanOrEqual(0);
      expect(check.error).toBeUndefined();
    }

    // agrupamento
    expect(
      report.checks.filter((c) => c.group === 'infra').map((c) => c.service),
    ).toEqual(['API', 'Supabase DB', 'Supabase Auth']);
    expect(
      report.checks.filter((c) => c.group === 'area').map((c) => c.service),
    ).toEqual(['Login', 'Orders', 'Catalog']);
  });

  it('marca a área com falha como down e o geral como degraded', async () => {
    const service = new AdminHealthService(
      makeSupabaseStub({ failTables: ['orders'] }) as any,
    );
    const report = await service.getHealth();

    expect(report.status).toBe('degraded');

    const orders = report.checks.find((c) => c.service === 'Orders')!;
    expect(orders.status).toBe('down');
    expect(orders.error).toContain('orders');

    // as outras seguem up
    expect(report.checks.find((c) => c.service === 'Catalog')!.status).toBe('up');
    expect(report.checks.find((c) => c.service === 'Login')!.status).toBe('up');
  });

  it('marca Supabase Auth como down quando listUsers falha', async () => {
    const service = new AdminHealthService(
      makeSupabaseStub({ failAuth: true }) as any,
    );
    const report = await service.getHealth();

    expect(report.status).toBe('degraded');
    const auth = report.checks.find((c) => c.service === 'Supabase Auth')!;
    expect(auth.status).toBe('down');
    expect(auth.error).toContain('auth fora do ar');
  });
});
