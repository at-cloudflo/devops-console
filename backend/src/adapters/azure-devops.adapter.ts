import path from 'path';
import fs from 'fs';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval, AgentStatus, JobStatus, AlertState } from '../models/devops.model';

/**
 * Azure DevOps Adapter
 *
 * Switch between mock and live data via environment variable:
 *   USE_MOCK_DEVOPS=false   → calls Azure DevOps REST API v7.1
 *   USE_MOCK_DEVOPS=true    → reads static mock JSON (default)
 *
 * Required env vars for live mode:
 *   AZURE_DEVOPS_ORG_URL    e.g. https://dev.azure.com/my-org
 *   AZURE_DEVOPS_PAT        Personal Access Token (read scopes: Agent Pools, Build, Release, Environment)
 *   AZURE_DEVOPS_PROJECTS   Comma-separated project names e.g. "ProjectA,ProjectB"
 */

export const USE_MOCK_DEVOPS = process.env.USE_MOCK_DEVOPS !== 'false';

// ── Shared helpers ─────────────────────────────────────────────────────────

function loadMockData<T>(filename: string): T {
  const filePath = path.join(__dirname, '../data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function simulateDelay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock implementations ───────────────────────────────────────────────────

async function fetchPoolsMock(): Promise<PoolSummary[]> {
  await simulateDelay(30);
  return loadMockData<PoolSummary[]>('mock-pools.json');
}

async function fetchAgentsMock(poolId?: string): Promise<AgentDetail[]> {
  await simulateDelay(40);
  const agents = loadMockData<AgentDetail[]>('mock-agents.json');
  return poolId ? agents.filter((a) => a.poolId === poolId) : agents;
}

async function fetchQueueJobsMock(since?: Date, projectKey?: string, poolName?: string): Promise<QueueJob[]> {
  await simulateDelay(35);
  let jobs = loadMockData<QueueJob[]>('mock-queue.json');
  if (since) jobs = jobs.filter((j) => new Date(j.requestedAt) >= since);
  if (projectKey) jobs = jobs.filter((j) => j.project === projectKey);
  if (poolName) jobs = jobs.filter((j) => j.pool === poolName);
  return jobs;
}

async function fetchApprovalsMock(projectKey?: string): Promise<PendingApproval[]> {
  await simulateDelay(25);
  let approvals = loadMockData<PendingApproval[]>('mock-approvals.json');
  if (projectKey) approvals = approvals.filter((a) => a.project === projectKey);
  return approvals;
}

// ── Live configuration ─────────────────────────────────────────────────────

const ADO_ORG_URL = (process.env.AZURE_DEVOPS_ORG_URL ?? '').replace(/\/$/, '');
const ADO_PAT = process.env.AZURE_DEVOPS_PAT ?? '';
const ADO_PROJECTS = (process.env.AZURE_DEVOPS_PROJECTS ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const ADO_ORG_NAME = ADO_ORG_URL.split('/').pop() ?? '';

function adoHeaders(): Record<string, string> {
  const token = Buffer.from(`:${ADO_PAT}`).toString('base64');
  return { Authorization: `Basic ${token}`, Accept: 'application/json' };
}

async function adoGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: adoHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ADO API ${res.status} ${res.statusText}: ${url}\n${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Live: type mappers ─────────────────────────────────────────────────────

function mapAgentStatus(adoStatus: string, enabled: boolean): AgentStatus {
  if (!enabled) return 'disabled';
  switch (adoStatus?.toLowerCase()) {
    case 'online': return 'online';
    case 'offline': return 'offline';
    default: return 'offline';
  }
}

function mapBuildStatus(status: string, result?: string): JobStatus {
  switch (status) {
    case 'inProgress':
    case 'cancelling':
      return 'running';
    case 'completed':
      if (result === 'failed' || result === 'partiallySucceeded') return 'failed';
      if (result === 'canceled') return 'cancelled';
      return 'completed';
    default:
      return 'queued'; // notStarted, postponed
  }
}

function poolAlertState(healthPercent: number): AlertState {
  if (healthPercent >= 70) return 'healthy';
  if (healthPercent >= 50) return 'warning';
  return 'critical';
}

// ── Live implementations ───────────────────────────────────────────────────

async function fetchPoolsLive(): Promise<PoolSummary[]> {
  const poolsResp = await adoGet<{ value: AdoPool[] }>(
    `${ADO_ORG_URL}/_apis/distributedtask/pools?api-version=7.1`
  );

  // Fetch agents for every pool in parallel to compute summary stats
  const agentResults = await Promise.all(
    poolsResp.value.map((pool) =>
      adoGet<{ value: AdoAgent[] }>(
        `${ADO_ORG_URL}/_apis/distributedtask/pools/${pool.id}/agents?api-version=7.1`
      )
        .then((r) => ({ poolId: pool.id, agents: r.value }))
        .catch(() => ({ poolId: pool.id, agents: [] as AdoAgent[] }))
    )
  );

  const agentMap = new Map(agentResults.map((r) => [r.poolId, r.agents]));

  return poolsResp.value.map((pool) => {
    const agents = agentMap.get(pool.id) ?? [];
    const total = agents.length;
    const online = agents.filter((a) => a.status === 'online' && a.enabled).length;
    const offline = agents.filter((a) => a.status === 'offline' && a.enabled).length;
    const busy = agents.filter((a) => a.assignedRequest != null).length;
    const healthPercent = total > 0 ? Math.round((online / total) * 100) : 100;

    return {
      id: String(pool.id),
      name: pool.name,
      organization: ADO_ORG_NAME,
      totalAgents: total,
      onlineAgents: online,
      offlineAgents: offline,
      busyAgents: busy,
      idleAgents: Math.max(0, online - busy),
      healthPercent,
      alertState: poolAlertState(healthPercent),
      lastRefresh: new Date().toISOString(),
    } satisfies PoolSummary;
  });
}

async function fetchAgentsLive(poolId?: string): Promise<AgentDetail[]> {
  let targetPools: Array<{ id: number; name: string }>;

  if (poolId) {
    targetPools = [{ id: parseInt(poolId, 10), name: '' }];
  } else {
    const resp = await adoGet<{ value: AdoPool[] }>(
      `${ADO_ORG_URL}/_apis/distributedtask/pools?api-version=7.1`
    );
    targetPools = resp.value.map((p) => ({ id: p.id, name: p.name }));
  }

  const results = await Promise.all(
    targetPools.map((pool) =>
      adoGet<{ value: AdoAgent[] }>(
        `${ADO_ORG_URL}/_apis/distributedtask/pools/${pool.id}/agents?includeCapabilities=true&api-version=7.1`
      )
        .then((r) =>
          r.value.map((agent) => ({
            id: String(agent.id),
            name: agent.name,
            poolId: String(pool.id),
            poolName: pool.name,
            status: mapAgentStatus(agent.status, agent.enabled),
            enabled: agent.enabled,
            busy: agent.assignedRequest != null,
            lastSeen: agent.createdOn ?? new Date().toISOString(),
            osDescription: agent.osDescription ?? '',
            version: agent.version ?? '',
            capabilities: {
              ...(agent.systemCapabilities ?? {}),
              ...(agent.userCapabilities ?? {}),
            },
            tags: Object.keys(agent.userCapabilities ?? {}),
            alertState: agent.status === 'offline' && agent.enabled ? 'warning' : ('healthy' as AlertState),
            organization: ADO_ORG_NAME,
          } satisfies AgentDetail))
        )
        .catch(() => [] as AgentDetail[])
    )
  );

  return results.flat();
}

async function fetchQueueJobsLive(since?: Date, projectKey?: string): Promise<QueueJob[]> {
  const projects = projectKey ? [projectKey] : ADO_PROJECTS;
  if (projects.length === 0) {
    throw new Error('Set AZURE_DEVOPS_PROJECTS (comma-separated) to use live queue data');
  }

  const sinceParam = since ? `&minTime=${since.toISOString()}` : '';

  const results = await Promise.all(
    projects.map((project) =>
      adoGet<{ value: AdoBuild[] }>(
        `${ADO_ORG_URL}/${project}/_apis/build/builds?$top=100${sinceParam}&api-version=7.1`
      )
        .then((r) =>
          r.value.map((build) => {
            const queuedAt = build.queueTime ?? build.startTime ?? new Date().toISOString();
            const queueDuration = build.startTime
              ? Math.floor((new Date(build.startTime).getTime() - new Date(queuedAt).getTime()) / 1000)
              : Math.floor((Date.now() - new Date(queuedAt).getTime()) / 1000);

            return {
              id: String(build.id),
              jobId: String(build.id),
              pipelineName: build.definition?.name ?? 'Unknown',
              project: build.project?.name ?? project,
              organization: ADO_ORG_NAME,
              pool: build.queue?.name ?? '',
              requestedBy: build.requestedBy?.uniqueName ?? build.requestedBy?.displayName ?? '',
              requestedAt: queuedAt,
              startedAt: build.startTime,
              finishedAt: build.finishTime,
              queueDurationSeconds: Math.max(0, queueDuration),
              status: mapBuildStatus(build.status, build.result),
              approvalRequired: false,
              priority: 0,
            } satisfies QueueJob;
          })
        )
        .catch(() => [] as QueueJob[])
    )
  );

  return results.flat();
}

async function fetchApprovalsLive(projectKey?: string): Promise<PendingApproval[]> {
  const projects = projectKey ? [projectKey] : ADO_PROJECTS;
  if (projects.length === 0) {
    throw new Error('Set AZURE_DEVOPS_PROJECTS (comma-separated) to use live approvals data');
  }

  const results = await Promise.all(
    projects.map((project) =>
      adoGet<{ value: AdoApproval[] }>(
        `${ADO_ORG_URL}/${project}/_apis/pipelines/approvals?state=pending&api-version=7.1-preview.1`
      )
        .then((r) =>
          r.value.map((a) => {
            const waitingSince = a.createdOn ?? new Date().toISOString();
            const ageMinutes = Math.floor(
              (Date.now() - new Date(waitingSince).getTime()) / 60_000
            );
            return {
              id: a.id,
              project,
              organization: ADO_ORG_NAME,
              pipelineName: a.pipeline?.name ?? 'Unknown',
              stageName: a.stage?.name ?? '',
              environmentName: a.environment?.name ?? '',
              approvers: (a.steps ?? [])
                .map((s) => s.actualApprover?.uniqueName ?? s.actualApprover?.displayName ?? '')
                .filter(Boolean),
              waitingSince,
              ageMinutes,
              status: 'pending',
              runId: String(a.pipeline?.runId ?? a.id),
            } satisfies PendingApproval;
          })
        )
        .catch(() => [] as PendingApproval[])
    )
  );

  return results.flat();
}

// ── ADO API response shapes (internal) ────────────────────────────────────

interface AdoPool { id: number; name: string; }
interface AdoAgent {
  id: number; name: string; version: string; osDescription: string;
  enabled: boolean; status: string; createdOn?: string;
  assignedRequest?: unknown;
  systemCapabilities?: Record<string, string>;
  userCapabilities?: Record<string, string>;
}
interface AdoBuild {
  id: number; status: string; result?: string;
  definition?: { name: string };
  project?: { name: string };
  queue?: { name: string };
  requestedBy?: { uniqueName?: string; displayName?: string };
  queueTime?: string; startTime?: string; finishTime?: string;
}
interface AdoApproval {
  id: string; createdOn?: string;
  pipeline?: { name: string; runId?: number };
  stage?: { name: string };
  environment?: { name: string };
  steps?: Array<{ actualApprover?: { uniqueName?: string; displayName?: string } }>;
}

// ── Public exports ─────────────────────────────────────────────────────────

export const fetchPools = USE_MOCK_DEVOPS ? fetchPoolsMock : fetchPoolsLive;
export const fetchAgents = USE_MOCK_DEVOPS ? fetchAgentsMock : fetchAgentsLive;
export const fetchQueueJobs = USE_MOCK_DEVOPS ? fetchQueueJobsMock : fetchQueueJobsLive;
export const fetchApprovals = USE_MOCK_DEVOPS ? fetchApprovalsMock : fetchApprovalsLive;
