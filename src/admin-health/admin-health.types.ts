export type CheckStatus = 'up' | 'down';

export interface HealthCheck {
  service: string;
  group: 'infra' | 'area';
  status: CheckStatus;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: 'up' | 'degraded';
  checkedAt: string;
  checks: HealthCheck[];
}
