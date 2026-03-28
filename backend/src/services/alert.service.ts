import { Alert, AlertType, AlertSeverity, AlertStatus } from '../models/alert.model';
import * as cacheService from '../cache/cache.service';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval } from '../models/devops.model';
import { VertexJob } from '../models/mlops.model';
import * as configService from './config.service';

// In-memory alert store for POC
const alertStore = new Map<string, Alert>();

export function getAlerts(status?: AlertStatus): Alert[] {
  const alerts = Array.from(alertStore.values());
  if (status) return alerts.filter((a) => a.status === status);
  return alerts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function acknowledgeAlert(id: string, userId: string): Alert | null {
  const alert = alertStore.get(id);
  if (!alert) return null;
  alert.acknowledged = true;
  alert.acknowledgedBy = userId;
  alert.acknowledgedAt = new Date().toISOString();
  alert.status = 'acknowledged';
  alert.updatedAt = new Date().toISOString();
  return alert;
}

export function resolveAlert(id: string): Alert | null {
  const alert = alertStore.get(id);
  if (!alert) return null;
  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.updatedAt = new Date().toISOString();
  return alert;
}

export function runAlertEngine(): void {
  const config = configService.getConfig();
  const thresholds = config.alertThresholds;
  const now = new Date();

  // --- Pool availability alerts ---
  const pools = cacheService.getCache('pools') ?? [];
  for (const pool of pools) {
    const poolAlertId = `pool-avail-${pool.id}`;
    if (pool.healthPercent < thresholds.poolCriticalPercent) {
      upsertAlert(poolAlertId, {
        type: 'pool_availability',
        severity: 'critical',
        source: pool.name,
        sourceId: pool.id,
        message: `Pool "${pool.name}" availability is ${pool.healthPercent.toFixed(1)}% (critical threshold: ${thresholds.poolCriticalPercent}%)`,
        metadata: { healthPercent: pool.healthPercent, threshold: thresholds.poolCriticalPercent },
      });
    } else if (pool.healthPercent < thresholds.poolWarningPercent) {
      upsertAlert(poolAlertId, {
        type: 'pool_availability',
        severity: 'warning',
        source: pool.name,
        sourceId: pool.id,
        message: `Pool "${pool.name}" availability is ${pool.healthPercent.toFixed(1)}% (warning threshold: ${thresholds.poolWarningPercent}%)`,
        metadata: { healthPercent: pool.healthPercent, threshold: thresholds.poolWarningPercent },
      });
    } else {
      resolveAlertBySourceId(`pool-avail-${pool.id}`);
    }
  }

  // --- Agent offline alerts ---
  const agents = cacheService.getCache('agents') ?? [];
  const offlineThresholdMs = thresholds.agentOfflineMinutes * 60 * 1000;
  for (const agent of agents) {
    if (agent.status === 'offline' && agent.enabled) {
      const lastSeen = new Date(agent.lastSeen);
      const offlineMs = now.getTime() - lastSeen.getTime();
      if (offlineMs > offlineThresholdMs) {
        const alertId = `agent-offline-${agent.id}`;
        const offlineMinutes = Math.floor(offlineMs / 60000);
        upsertAlert(alertId, {
          type: 'agent_offline',
          severity: offlineMs > offlineThresholdMs * 3 ? 'critical' : 'warning',
          source: agent.name,
          sourceId: agent.id,
          message: `Agent "${agent.name}" (${agent.poolName}) has been offline for ${offlineMinutes} minutes`,
          metadata: { poolId: agent.poolId, lastSeen: agent.lastSeen, offlineMinutes },
        });
      }
    }
  }

  // --- Queue wait time alerts ---
  const queue = cacheService.getCache('queue') ?? [];
  const queueWaitThresholdMs = thresholds.queueWaitMinutes * 60 * 1000;
  for (const job of queue) {
    if (job.status === 'queued') {
      const queuedAt = new Date(job.requestedAt);
      const waitMs = now.getTime() - queuedAt.getTime();
      if (waitMs > queueWaitThresholdMs) {
        const alertId = `queue-wait-${job.id}`;
        const waitMinutes = Math.floor(waitMs / 60000);
        upsertAlert(alertId, {
          type: 'queue_wait_time',
          severity: waitMinutes > thresholds.queueWaitMinutes * 2 ? 'critical' : 'warning',
          source: job.pipelineName,
          sourceId: job.id,
          message: `Job "${job.pipelineName}" in "${job.pool}" has been queued for ${waitMinutes} minutes`,
          metadata: { pool: job.pool, project: job.project, waitMinutes },
        });
      }
    }
  }

  // --- Pending approval age alerts ---
  const approvals = cacheService.getCache('approvals') ?? [];
  const approvalAgeThresholdMs = thresholds.approvalAgeHours * 3600 * 1000;
  for (const approval of approvals) {
    if (approval.status === 'pending') {
      const waitingMs = now.getTime() - new Date(approval.waitingSince).getTime();
      if (waitingMs > approvalAgeThresholdMs) {
        const alertId = `approval-age-${approval.id}`;
        const ageHours = (waitingMs / 3600000).toFixed(1);
        upsertAlert(alertId, {
          type: 'approval_age',
          severity: waitingMs > approvalAgeThresholdMs * 2 ? 'critical' : 'warning',
          source: approval.pipelineName,
          sourceId: approval.id,
          message: `Approval for "${approval.pipelineName}" stage "${approval.stageName}" has been pending for ${ageHours} hours`,
          metadata: { project: approval.project, stageName: approval.stageName, ageHours },
        });
      }
    }
  }

  // --- Vertex job failure alerts ---
  const vertexJobs = cacheService.getCache('vertexJobs') ?? [];
  for (const job of vertexJobs) {
    if (job.state === 'PIPELINE_STATE_FAILED') {
      const alertId = `vertex-failed-${job.id}`;
      upsertAlert(alertId, {
        type: 'vertex_job_failed',
        severity: 'warning',
        source: job.displayName,
        sourceId: job.id,
        message: `Vertex AI job "${job.displayName}" (${job.projectId}/${job.region}) failed`,
        metadata: { projectId: job.projectId, region: job.region, pipelineName: job.pipelineName },
      });
    }
  }
}

function upsertAlert(
  id: string,
  data: {
    type: AlertType;
    severity: AlertSeverity;
    source: string;
    sourceId: string;
    message: string;
    metadata: Record<string, unknown>;
  }
): void {
  const existing = alertStore.get(id);
  const now = new Date().toISOString();
  if (existing && existing.status !== 'resolved') {
    existing.message = data.message;
    existing.severity = data.severity;
    existing.updatedAt = now;
    existing.metadata = data.metadata;
    return;
  }
  const alert: Alert = {
    id,
    type: data.type,
    severity: data.severity,
    source: data.source,
    sourceId: data.sourceId,
    message: data.message,
    startedAt: now,
    updatedAt: now,
    status: 'open',
    acknowledged: false,
    metadata: data.metadata,
  };
  alertStore.set(id, alert);
}

function resolveAlertBySourceId(id: string): void {
  const alert = alertStore.get(id);
  if (alert && alert.status === 'open') {
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();
  }
}
