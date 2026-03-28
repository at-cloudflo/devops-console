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

export interface TeamsNotificationsConfig {
  enabled: boolean;
  webhookUrl: string;
  /** Minimum severity to notify: 'info' | 'warning' | 'critical' */
  minSeverity: 'info' | 'warning' | 'critical';
  /** Send notification when a new alert fires */
  notifyOnNew: boolean;
  /** Send notification when an alert escalates from warning → critical */
  notifyOnEscalation: boolean;
  /** Send notification when an alert is resolved */
  notifyOnResolution: boolean;
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
  teamsNotifications: TeamsNotificationsConfig;
  updatedAt: string;
  updatedBy: string;
}
