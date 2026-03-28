import path from 'path';
import fs from 'fs';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval } from '../models/devops.model';

/**
 * Azure DevOps Adapter
 *
 * In production, this adapter would call the Azure DevOps REST API using
 * a PAT or service principal token. For the POC, it reads from mock JSON
 * files with a small artificial delay to simulate network latency.
 *
 * To integrate with real Azure DevOps:
 * 1. Replace loadMockData() calls with HTTP calls to:
 *    https://dev.azure.com/{org}/_apis/distributedtask/pools
 *    https://dev.azure.com/{org}/_apis/distributedtask/pools/{poolId}/agents
 *    https://dev.azure.com/{org}/{project}/_apis/build/builds
 *    etc.
 * 2. Pass the PAT via Authorization header: Basic base64(":PAT")
 * 3. Handle pagination with continuationToken
 */

function loadMockData<T>(filename: string): T {
  const filePath = path.join(__dirname, '../data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function simulateDelay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPools(): Promise<PoolSummary[]> {
  await simulateDelay(30);
  return loadMockData<PoolSummary[]>('mock-pools.json');
}

export async function fetchAgents(poolId?: string): Promise<AgentDetail[]> {
  await simulateDelay(40);
  const agents = loadMockData<AgentDetail[]>('mock-agents.json');
  if (poolId) {
    return agents.filter((a) => a.poolId === poolId);
  }
  return agents;
}

export async function fetchQueueJobs(
  since?: Date,
  projectKey?: string,
  poolName?: string
): Promise<QueueJob[]> {
  await simulateDelay(35);
  let jobs = loadMockData<QueueJob[]>('mock-queue.json');

  if (since) {
    jobs = jobs.filter((j) => new Date(j.requestedAt) >= since);
  }
  if (projectKey) {
    jobs = jobs.filter((j) => j.project === projectKey);
  }
  if (poolName) {
    jobs = jobs.filter((j) => j.pool === poolName);
  }
  return jobs;
}

export async function fetchApprovals(projectKey?: string): Promise<PendingApproval[]> {
  await simulateDelay(25);
  let approvals = loadMockData<PendingApproval[]>('mock-approvals.json');
  if (projectKey) {
    approvals = approvals.filter((a) => a.project === projectKey);
  }
  return approvals;
}
