import { Request, Response } from 'express';
import * as devopsService from '../services/devops.service';
import * as mlopsService from '../services/mlops.service';
import * as alertService from '../services/alert.service';
import * as cacheService from '../cache/cache.service';

export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const [pools, agents, queue, approvals, vertexSummary] = await Promise.all([
      devopsService.getPools(),
      devopsService.getAgents(),
      devopsService.getQueueJobs(new Date(Date.now() - 6 * 3600 * 1000)),
      devopsService.getApprovals(),
      mlopsService.getVertexJobsSummary(),
    ]);

    const alerts = alertService.getAlerts('open');
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    const totalAgents = agents.length;
    const offlineAgents = agents.filter((a) => a.status === 'offline').length;
    const queuedJobs = queue.filter((j) => j.status === 'queued').length;
    const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

    const systemStatus = criticalAlerts > 0 ? 'degraded' : offlineAgents > 0 ? 'warning' : 'healthy';

    res.json({
      totalPools: pools.length,
      totalAgents,
      offlineAgents,
      criticalAlerts,
      totalAlerts: alerts.length,
      queuedJobsLast6h: queuedJobs,
      runningJobs: queue.filter((j) => j.status === 'running').length,
      pendingApprovals,
      vertexRunning: vertexSummary.running,
      vertexFailed: vertexSummary.failed,
      systemStatus,
      poolsHealthy: pools.filter((p) => p.alertState === 'healthy').length,
      poolsWarning: pools.filter((p) => p.alertState === 'warning').length,
      poolsCritical: pools.filter((p) => p.alertState === 'critical').length,
      lastRefresh: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[dashboard] summary error:', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
}
