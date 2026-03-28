import { PoolSummary, AgentDetail, QueueJob, PendingApproval } from '../models/devops.model';
import { VertexJob } from '../models/mlops.model';
import { Alert } from '../models/alert.model';

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // unix ms
}

interface Cache {
  pools?: CacheEntry<PoolSummary[]>;
  agents?: CacheEntry<AgentDetail[]>;
  queue?: CacheEntry<QueueJob[]>;
  approvals?: CacheEntry<PendingApproval[]>;
  vertexJobs?: CacheEntry<VertexJob[]>;
  alerts?: CacheEntry<Alert[]>;
}

const cache: Cache = {};

export function setCache<K extends keyof Cache>(
  key: K,
  data: NonNullable<Cache[K]> extends CacheEntry<infer T> ? T : never
): void {
  (cache[key] as CacheEntry<unknown>) = { data, cachedAt: Date.now() };
}

export function getCache<K extends keyof Cache>(
  key: K
): NonNullable<Cache[K]> extends CacheEntry<infer T> ? T | null : never {
  const entry = cache[key];
  if (!entry) return null as never;
  return (entry as CacheEntry<unknown>).data as never;
}

export function getCachedAt(key: keyof Cache): Date | null {
  const entry = cache[key];
  if (!entry) return null;
  return new Date(entry.cachedAt);
}

export function isCacheStale(key: keyof Cache, ttlMs: number): boolean {
  const entry = cache[key];
  if (!entry) return true;
  return Date.now() - entry.cachedAt > ttlMs;
}

export function clearCache(key?: keyof Cache): void {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach((k) => delete (cache as Record<string, unknown>)[k]);
  }
}
