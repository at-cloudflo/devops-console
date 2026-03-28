import * as devopsService from './devops.service';
import * as mlopsService from './mlops.service';
import * as alertService from './alert.service';
import * as cacheService from '../cache/cache.service';
import * as configService from './config.service';

interface RefreshStatus {
  resource: string;
  lastRefresh: string | null;
  intervalMs: number;
  source: 'mock' | 'live';
}

const refreshTimestamps = new Map<string, number>();

async function refreshAll(): Promise<void> {
  const config = configService.getConfig();
  const intervals = config.refreshIntervals;

  const tasks = [
    { key: 'pools', fn: () => devopsService.getPools(true), interval: intervals.poolsMs },
    { key: 'agents', fn: () => devopsService.getAgents(undefined, true), interval: intervals.agentsMs },
    { key: 'queue', fn: () => devopsService.getQueueJobs(undefined, undefined, undefined, true), interval: intervals.queueMs },
    { key: 'approvals', fn: () => devopsService.getApprovals(undefined, true), interval: intervals.approvalsMs },
    { key: 'vertexJobs', fn: () => mlopsService.getVertexJobs(undefined, true), interval: intervals.vertexJobsMs },
  ];

  for (const task of tasks) {
    try {
      await task.fn();
      refreshTimestamps.set(task.key, Date.now());
    } catch (err) {
      console.error(`[refresh] Failed to refresh ${task.key}:`, err);
    }
  }

  // Run alert engine after all data is refreshed
  try {
    alertService.runAlertEngine();
    refreshTimestamps.set('alerts', Date.now());
  } catch (err) {
    console.error('[refresh] Alert engine error:', err);
  }
}

export function getRefreshStatus(): RefreshStatus[] {
  const config = configService.getConfig();
  const intervals = config.refreshIntervals;

  const resources = [
    { key: 'pools', intervalMs: intervals.poolsMs },
    { key: 'agents', intervalMs: intervals.agentsMs },
    { key: 'queue', intervalMs: intervals.queueMs },
    { key: 'approvals', intervalMs: intervals.approvalsMs },
    { key: 'vertexJobs', intervalMs: intervals.vertexJobsMs },
    { key: 'alerts', intervalMs: intervals.alertsMs },
  ];

  return resources.map(({ key, intervalMs }) => {
    const ts = refreshTimestamps.get(key);
    return {
      resource: key,
      lastRefresh: ts ? new Date(ts).toISOString() : null,
      intervalMs,
      source: 'mock' as const,
    };
  });
}

export async function triggerManualRefresh(): Promise<void> {
  await refreshAll();
}

export function startBackgroundRefresh(): void {
  // Initial load
  refreshAll().catch(console.error);

  // The refresh scheduler runs every 15s and decides per-resource whether TTL has passed.
  // This approach avoids needing separate timers per resource.
  setInterval(() => {
    const config = configService.getConfig();
    const intervals = config.refreshIntervals;
    const now = Date.now();

    const checks = [
      { key: 'pools', fn: () => devopsService.getPools(true), interval: intervals.poolsMs },
      { key: 'agents', fn: () => devopsService.getAgents(undefined, true), interval: intervals.agentsMs },
      { key: 'queue', fn: () => devopsService.getQueueJobs(undefined, undefined, undefined, true), interval: intervals.queueMs },
      { key: 'approvals', fn: () => devopsService.getApprovals(undefined, true), interval: intervals.approvalsMs },
      { key: 'vertexJobs', fn: () => mlopsService.getVertexJobs(undefined, true), interval: intervals.vertexJobsMs },
    ];

    for (const { key, fn, interval } of checks) {
      const lastTs = refreshTimestamps.get(key) ?? 0;
      if (now - lastTs >= interval) {
        fn()
          .then(() => {
            refreshTimestamps.set(key, Date.now());
            alertService.runAlertEngine();
            refreshTimestamps.set('alerts', Date.now());
          })
          .catch((err: unknown) => console.error(`[refresh] ${key}:`, err));
      }
    }
  }, 15_000);
}
