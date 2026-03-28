export interface AzureDevOpsOrg {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface MonitoredProject {
  id: string;
  orgId: string;
  name: string;
  projectKey: string;
  enabled: boolean;
}

export interface MonitoredPool {
  id: string;
  orgId: string;
  poolId: string;
  poolName: string;
  enabled: boolean;
}

export interface GcpProject {
  id: string;
  projectId: string;
  displayName: string;
  regions: string[];
  enabled: boolean;
}

export interface AlertThresholds {
  poolCriticalPercent: number;
  poolWarningPercent: number;
  agentOfflineMinutes: number;
  queueWaitMinutes: number;
  approvalAgeHours: number;
}

export interface RefreshIntervals {
  poolsMs: number;
  agentsMs: number;
  queueMs: number;
  approvalsMs: number;
  vertexJobsMs: number;
  alertsMs: number;
}

export interface FeatureFlags {
  enableApprovalActions: boolean;
  enableAlertNotifications: boolean;
  enableConfigEdit: boolean;
  enableVertexLogs: boolean;
  enableDarkMode: boolean;
}

export interface DisplayConfig {
  defaultTheme: 'light' | 'dark';
  dateFormat: string;
  timeZone: string;
  pageSize: number;
}

export interface SystemConfig {
  azureDevOpsOrgs: AzureDevOpsOrg[];
  monitoredProjects: MonitoredProject[];
  monitoredPools: MonitoredPool[];
  gcpProjects: GcpProject[];
  alertThresholds: AlertThresholds;
  refreshIntervals: RefreshIntervals;
  featureFlags: FeatureFlags;
  displayConfig: DisplayConfig;
  updatedAt: string;
  updatedBy: string;
}
