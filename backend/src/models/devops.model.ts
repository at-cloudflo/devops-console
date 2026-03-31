export type AgentStatus = 'online' | 'offline' | 'busy' | 'disabled';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertState = 'healthy' | 'warning' | 'critical';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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
  lastRefresh: string; // ISO date
}

export interface AgentDetail {
  id: string;
  name: string;
  poolId: string;
  poolName: string;
  status: AgentStatus;
  enabled: boolean;
  busy: boolean;
  lastSeen: string; // ISO date
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
  requestedAt: string; // ISO date
  startedAt?: string;  // ISO date
  finishedAt?: string; // ISO date
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
  waitingSince: string; // ISO date
  ageMinutes: number;
  status: ApprovalStatus;
  runId: string;
  url?: string;
}

export interface ProjectAdmin {
  id: string;
  displayName: string;
  uniqueName: string;
  imageUrl?: string;
  project: string;
  organization: string;
}

export interface RefreshMetadata {
  resource: string;
  lastRefresh: string; // ISO date
  nextRefresh: string; // ISO date
  intervalMs: number;
  source: 'mock' | 'live';
}
