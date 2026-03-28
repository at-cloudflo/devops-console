import * as azureAdapter from '../adapters/azure-devops.adapter';
import * as cacheService from '../cache/cache.service';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval } from '../models/devops.model';

const CACHE_TTL_POOLS = 60_000;
const CACHE_TTL_AGENTS = 60_000;
const CACHE_TTL_QUEUE = 30_000;
const CACHE_TTL_APPROVALS = 30_000;

export async function getPools(forceRefresh = false): Promise<PoolSummary[]> {
  if (!forceRefresh && !cacheService.isCacheStale('pools', CACHE_TTL_POOLS)) {
    return cacheService.getCache('pools') ?? [];
  }
  const pools = await azureAdapter.fetchPools();
  cacheService.setCache('pools', pools);
  return pools;
}

export async function getAgents(poolId?: string, forceRefresh = false): Promise<AgentDetail[]> {
  if (!forceRefresh && !cacheService.isCacheStale('agents', CACHE_TTL_AGENTS)) {
    const cached = cacheService.getCache('agents') ?? [];
    return poolId ? cached.filter((a: AgentDetail) => a.poolId === poolId) : cached;
  }
  const agents = await azureAdapter.fetchAgents();
  cacheService.setCache('agents', agents);
  if (poolId) return agents.filter((a) => a.poolId === poolId);
  return agents;
}

export async function getQueueJobs(
  since?: Date,
  project?: string,
  pool?: string,
  forceRefresh = false
): Promise<QueueJob[]> {
  if (!forceRefresh && !cacheService.isCacheStale('queue', CACHE_TTL_QUEUE)) {
    let cached = cacheService.getCache('queue') ?? [];
    if (since) cached = cached.filter((j: QueueJob) => new Date(j.requestedAt) >= since);
    if (project) cached = cached.filter((j: QueueJob) => j.project === project);
    if (pool) cached = cached.filter((j: QueueJob) => j.pool === pool);
    return cached;
  }
  const jobs = await azureAdapter.fetchQueueJobs(since, project, pool);
  // Store unfiltered result in cache
  const allJobs = await azureAdapter.fetchQueueJobs();
  cacheService.setCache('queue', allJobs);
  return jobs;
}

export async function getApprovals(project?: string, forceRefresh = false): Promise<PendingApproval[]> {
  if (!forceRefresh && !cacheService.isCacheStale('approvals', CACHE_TTL_APPROVALS)) {
    const cached = cacheService.getCache('approvals') ?? [];
    return project ? cached.filter((a: PendingApproval) => a.project === project) : cached;
  }
  const approvals = await azureAdapter.fetchApprovals();
  cacheService.setCache('approvals', approvals);
  if (project) return approvals.filter((a) => a.project === project);
  return approvals;
}
