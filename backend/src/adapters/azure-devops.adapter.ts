import { PoolSummary, AgentDetail, QueueJob, PendingApproval, AgentStatus, JobStatus, AlertState } from '../models/devops.model';
import { concurrentMap } from '../utils/concurrent-map';

/**
 * Azure DevOps Adapter
 *
 * Calls Azure DevOps REST API v7.1 using Bearer token auth.
 * All projects are discovered dynamically from the org; use the exclusion
 * list to skip projects you don't want to monitor.
 *
 * Required env vars:
 *   AZURE_DEVOPS_ORG_URL              e.g. https://dev.azure.com/ali0046
 *   AZURE_DEVOPS_TOKEN                Bearer token
 *
 * Optional env vars:
 *   AZURE_DEVOPS_PROJECTS_EXCLUDE     Comma-separated project names to skip
 *   ADO_QUEUE_CONCURRENCY             Max parallel requests for queue jobs (default 10)
 *   ADO_APPROVAL_CONCURRENCY          Max parallel requests for approvals (default 15)
 */

const ADO_ORG_URL = (process.env.AZURE_DEVOPS_ORG_URL ?? '').replace(/\/$/, '');
const ADO_TOKEN = process.env.AZURE_DEVOPS_TOKEN ?? '';
const ADO_ORG_NAME = ADO_ORG_URL.split('/').pop() ?? '';

const ADO_EXCLUDE = new Set(
  (process.env.AZURE_DEVOPS_PROJECTS_EXCLUDE ?? '')
    .split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
);

const ADO_QUEUE_CONCURRENCY = parseInt(process.env.ADO_QUEUE_CONCURRENCY ?? '10', 10);
const ADO_APPROVAL_CONCURRENCY = parseInt(process.env.ADO_APPROVAL_CONCURRENCY ?? '15', 10);

// Project list cache — refreshed every 10 minutes
let _projectCache: string[] | null = null;
let _projectCachedAt = 0;
const PROJECT_CACHE_TTL_MS = 10 * 60 * 1000;

// ── HTTP helpers ───────────────────────────────────────────────────────────

function adoHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${ADO_TOKEN}`, Accept: 'application/json' };
}

async function adoGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: adoHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ADO API ${res.status} ${res.statusText}: ${url}\n${body}`);
  }
  return res.json() as Promise<T>;
}

async function adoPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...adoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ADO API ${res.status} ${res.statusText}: ${url}\n${text}`);
  }
  return res.json() as Promise<T>;
}

/** Wraps adoGet with a single retry on HTTP 429, honouring Retry-After. */
async function adoGetWithRetry<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: adoHeaders() });
    if (res.status === 429 && attempt < retries) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '5', 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ADO API ${res.status} ${res.statusText}: ${url}\n${body}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`ADO API failed after ${retries} retries: ${url}`);
}

// ── Project discovery ──────────────────────────────────────────────────────

export function clearProjectCache(): void {
  _projectCache = null;
  _projectCachedAt = 0;
}

export async function fetchAllProjects(): Promise<string[]> {
  if (_projectCache && Date.now() - _projectCachedAt < PROJECT_CACHE_TTL_MS) {
    return _projectCache;
  }

  const projects: string[] = [];
  let continuationToken: string | undefined;

  do {
    const tokenParam = continuationToken
      ? `&continuationToken=${continuationToken}`
      : '';
    const res = await fetch(
      `${ADO_ORG_URL}/_apis/projects?$top=500${tokenParam}&api-version=7.1`,
      { headers: adoHeaders() }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ADO projects API ${res.status}: ${body}`);
    }
    const json = await res.json() as { value: Array<{ name: string }> };
    for (const p of json.value) {
      if (!ADO_EXCLUDE.has(p.name.toLowerCase())) projects.push(p.name);
    }
    continuationToken = res.headers.get('x-ms-continuationtoken') ?? undefined;
  } while (continuationToken);

  _projectCache = projects;
  _projectCachedAt = Date.now();
  return projects;
}

// ── Type mappers ───────────────────────────────────────────────────────────

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
      return 'queued';
  }
}

function poolAlertState(healthPercent: number): AlertState {
  if (healthPercent >= 70) return 'healthy';
  if (healthPercent >= 50) return 'warning';
  return 'critical';
}

// ── Implementations ────────────────────────────────────────────────────────

export async function fetchPools(): Promise<PoolSummary[]> {
  const poolsResp = await adoGet<{ value: AdoPool[] }>(
    `${ADO_ORG_URL}/_apis/distributedtask/pools?api-version=7.1`
  );

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

export async function fetchAgents(poolId?: string): Promise<AgentDetail[]> {
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

export async function fetchQueueJobs(since?: Date, projectKey?: string): Promise<QueueJob[]> {
  const projects = projectKey ? [projectKey] : await fetchAllProjects();

  const sinceParam = since ? `&minTime=${since.toISOString()}` : '';

  const results = await concurrentMap(
    projects,
    (project) =>
      adoGetWithRetry<{ value: AdoBuild[] }>(
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
        .catch(() => [] as QueueJob[]),
    ADO_QUEUE_CONCURRENCY
  );

  return results.flat();
}

export async function fetchApprovals(projectKey?: string): Promise<PendingApproval[]> {
  const projects = projectKey ? [projectKey] : await fetchAllProjects();

  const results = await concurrentMap(
    projects,
    (project) =>
      adoGetWithRetry<{ value: AdoApproval[] }>(
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
                .map((s) => s.assignedApprover?.uniqueName ?? s.assignedApprover?.displayName ?? '')
                .filter(Boolean),
              waitingSince,
              ageMinutes,
              status: 'pending',
              runId: String(a.pipeline?.runId ?? a.id),
            } satisfies PendingApproval;
          })
        )
        .catch(() => [] as PendingApproval[]),
    ADO_APPROVAL_CONCURRENCY
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
  steps?: Array<{
    assignedApprover?: { uniqueName?: string; displayName?: string };
    actualApprover?: { uniqueName?: string; displayName?: string };
  }>;
}

// ── Approval actions ───────────────────────────────────────────────────────

export async function submitApproval(
  project: string,
  approvalId: string,
  status: 'approved' | 'rejected',
  comment?: string
): Promise<void> {
  await adoPatch<unknown>(
    `${ADO_ORG_URL}/${encodeURIComponent(project)}/_apis/pipelines/approvals?api-version=7.1-preview.1`,
    [{ approvalId, status, comment: comment ?? '' }]
  );
}
