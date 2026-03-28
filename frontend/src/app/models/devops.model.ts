export type AgentStatus = 'online' | 'offline' | 'busy' | 'disabled';
export type AlertState = 'healthy' | 'warning' | 'critical';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface PoolSummary {
  id: string;
  name: string;
  organization: string;
  project?: string;
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  busyAgents: number;
  idleAgents: number;
  healthPercent: number;
  alertState: AlertState;
  lastRefresh: string;
}

export interface AgentDetail {
  id: string;
  name: string;
  poolId: string;
  poolName: string;
  status: AgentStatus;
  enabled: boolean;
  busy: boolean;
  lastSeen: string;
  osDescription: string;
  version: string;
  capabilities: Record<string, string>;
  tags: string[];
  alertState: AlertState;
  organization: string;
}

export interface QueueJob {
  id: string;
  jobId: string;
  pipelineName: string;
  project: string;
  organization: string;
  pool: string;
  requestedBy: string;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  queueDurationSeconds: number;
  status: JobStatus;
  approvalRequired: boolean;
  priority: number;
}

export interface PendingApproval {
  id: string;
  project: string;
  organization: string;
  pipelineName: string;
  stageName: string;
  environmentName: string;
  approvers: string[];
  waitingSince: string;
  ageMinutes: number;
  status: ApprovalStatus;
  runId: string;
  url?: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  source: string;
  sourceId: string;
  message: string;
  startedAt: string;
  updatedAt: string;
  status: AlertStatus;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
}
