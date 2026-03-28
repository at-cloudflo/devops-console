export interface ApiResponse<T> {
  data: T;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RefreshStatus {
  resource: string;
  lastRefresh: string | null;
  intervalMs: number;
  source: 'mock' | 'live';
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
}

export interface DashboardSummary {
  totalPools: number;
  totalAgents: number;
  offlineAgents: number;
  criticalAlerts: number;
  totalAlerts: number;
  queuedJobsLast6h: number;
  runningJobs: number;
  pendingApprovals: number;
  vertexRunning: number;
  vertexFailed: number;
  systemStatus: 'healthy' | 'warning' | 'degraded';
  poolsHealthy: number;
  poolsWarning: number;
  poolsCritical: number;
  lastRefresh: string;
}
