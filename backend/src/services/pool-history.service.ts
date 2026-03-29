import { PoolSummary } from '../models/devops.model';
import { PoolUtilisationPoint, PoolHistoryResponse } from '../models/pool-history.model';

// Ring buffer: 24h at 1 snapshot/min = 1440 points per pool
const MAX_POINTS = 1440;

const history = new Map<string, PoolUtilisationPoint[]>();
const poolNames = new Map<string, string>();

export function recordSnapshot(pools: PoolSummary[]): void {
  const now = new Date().toISOString();
  for (const pool of pools) {
    poolNames.set(pool.id, pool.name);
    const point: PoolUtilisationPoint = {
      ts: now,
      busy: pool.busyAgents,
      idle: pool.idleAgents,
      offline: pool.offlineAgents,
      total: pool.totalAgents,
    };
    const buf = history.get(pool.id) ?? [];
    buf.push(point);
    if (buf.length > MAX_POINTS) buf.splice(0, buf.length - MAX_POINTS);
    history.set(pool.id, buf);
  }
}

export function getHistory(poolId: string, windowHours = 6): PoolHistoryResponse | null {
  const buf = history.get(poolId);
  if (!buf) return null;

  const cutoff = Date.now() - windowHours * 3600 * 1000;
  const points = buf.filter((p) => new Date(p.ts).getTime() >= cutoff);

  // Downsample to at most 120 points so the chart stays snappy
  const downsampled = downsample(points, 120);

  return {
    poolId,
    poolName: poolNames.get(poolId) ?? poolId,
    windowHours,
    points: downsampled,
  };
}

function downsample(points: PoolUtilisationPoint[], maxPoints: number): PoolUtilisationPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const result: PoolUtilisationPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}
