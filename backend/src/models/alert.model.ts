export type AlertDomain = 'devops' | 'mlops';

export type AlertType =
  | 'agent_offline'
  | 'pool_availability'
  | 'queue_wait_time'
  | 'approval_age'
  | 'vertex_job_failed'
  | 'system';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  domain: AlertDomain;
  type: AlertType;
  severity: AlertSeverity;
  source: string;       // e.g. pool name, agent name
  sourceId: string;     // e.g. pool id, agent id
  message: string;
  startedAt: string;    // ISO date
  updatedAt: string;    // ISO date
  status: AlertStatus;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  thresholdValue: number;
  thresholdUnit: string;
  description: string;
}
