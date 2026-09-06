import { Injectable } from '@nestjs/common';

import { SupabaseService } from '@/supabase/supabase.service';

import { HealthCheck, HealthReport } from './admin-health.types';

@Injectable()
export class AdminHealthService {
  constructor(private readonly supabase: SupabaseService) {}

  async getHealth(): Promise<HealthReport> {
    const checkedAt = new Date().toISOString();

    const checks = await Promise.all([
      // --- infra ---
      // A própria API: se este código roda, respondeu. Latência ~0 de propósito.
      this.timed('API', 'infra', async () => {
        // no-op: chegar aqui já significa que o processo está de pé.
      }),
      this.timed('Supabase DB', 'infra', () => this.pingTable('plans')),
      this.timed('Supabase Auth', 'infra', async () => {
        const { error } = await this.supabase.adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        if (error) throw new Error(error.message);
      }),

      // --- áreas da API (SELECT read-only leve na tabela principal) ---
      this.timed('Login', 'area', () => this.pingTable('members')),
      this.timed('Orders', 'area', () => this.pingTable('orders')),
      this.timed('Catalog', 'area', () => this.pingTable('catalog_items')),
    ]);

    const allUp = checks.every((check) => check.status === 'up');

    return {
      status: allUp ? 'up' : 'degraded',
      checkedAt,
      checks,
    };
  }

  // HEAD + count exato = ida ao banco sem trazer linha.
  private async pingTable(table: string) {
    const { error } = await this.supabase.adminClient
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(error.message);
    }
  }

  private async timed(
    service: string,
    group: 'infra' | 'area',
    fn: () => Promise<unknown>,
  ): Promise<HealthCheck> {
    const start = performance.now();
    try {
      await fn();
      return {
        service,
        group,
        status: 'up',
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      return {
        service,
        group,
        status: 'down',
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
