import path from 'path';
import fs from 'fs';
import { VertexJob, VertexJobDetail, VertexJobState, VertexJobsFilter } from '../models/mlops.model';

/**
 * Vertex AI Adapter
 *
 * Switch between mock and live data via environment variable:
 *   USE_MOCK_MLOPS=false   → calls Vertex AI Pipelines REST API
 *   USE_MOCK_MLOPS=true    → reads static mock JSON (default)
 *
 * Required env vars for live mode:
 *   GCP_PROJECTS    Comma-separated GCP project IDs e.g. "proj-a,proj-b"
 *   GCP_REGIONS     Comma-separated regions e.g. "us-central1,europe-west4"
 *
 * Authentication (pick one):
 *   GOOGLE_APPLICATION_CREDENTIALS  Path to service account key JSON (local dev)
 *   (none needed on Cloud Run — uses Workload Identity automatically)
 */

export const USE_MOCK_MLOPS = process.env.USE_MOCK_MLOPS !== 'false';

// ── Shared helpers ─────────────────────────────────────────────────────────

function loadMockData<T>(filename: string): T {
  const filePath = path.join(__dirname, '../data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function simulateDelay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock implementations ───────────────────────────────────────────────────

async function fetchVertexJobsMock(filter?: VertexJobsFilter): Promise<VertexJob[]> {
  await simulateDelay(45);
  let jobs = loadMockData<VertexJobDetail[]>('mock-vertex-jobs.json');

  if (filter?.projectId) jobs = jobs.filter((j) => j.projectId === filter.projectId);
  if (filter?.region) jobs = jobs.filter((j) => j.region === filter.region);
  if (filter?.state) jobs = jobs.filter((j) => j.state === filter.state);
  if (filter?.startAfter) {
    const after = new Date(filter.startAfter);
    jobs = jobs.filter((j) => j.startTime && new Date(j.startTime) >= after);
  }
  if (filter?.startBefore) {
    const before = new Date(filter.startBefore);
    jobs = jobs.filter((j) => j.startTime && new Date(j.startTime) <= before);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    jobs = jobs.filter(
      (j) => j.displayName.toLowerCase().includes(q) || j.pipelineName.toLowerCase().includes(q)
    );
  }

  // Strip detail-only fields for list response
  return jobs.map(({ parameters: _p, stateHistory: _s, ...job }) => job as VertexJob);
}

async function fetchVertexJobByIdMock(id: string): Promise<VertexJobDetail | null> {
  await simulateDelay(30);
  const jobs = loadMockData<VertexJobDetail[]>('mock-vertex-jobs.json');
  return jobs.find((j) => j.id === id) ?? null;
}

// ── Live configuration ─────────────────────────────────────────────────────

const GCP_PROJECTS = (process.env.GCP_PROJECTS ?? process.env.GCP_PROJECT_ID ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const GCP_REGIONS = (process.env.GCP_REGIONS ?? process.env.GCP_REGION ?? 'us-central1')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

// Cache the access token to avoid fetching it on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Dynamic import so google-auth-library is only loaded in live mode
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const tokenResp = await client.getAccessToken();
  const token = tokenResp.token ?? '';

  // Cache for 50 minutes (tokens last 60 min)
  cachedToken = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function vertexGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vertex AI API ${res.status} ${res.statusText}: ${url}\n${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Live: type mapper ──────────────────────────────────────────────────────

function mapVertexJob(j: VertexApiJob, projectId: string, region: string): VertexJob {
  const start = j.startTime ? new Date(j.startTime).getTime() : null;
  const end = j.endTime ? new Date(j.endTime).getTime() : null;
  const durationSeconds = start && end ? Math.floor((end - start) / 1000) : undefined;

  const pipelineName =
    j.pipelineSpec?.pipelineInfo?.name ??
    j.templateUri?.split('/').pop() ??
    j.displayName;

  return {
    id: j.name,
    displayName: j.displayName,
    pipelineName,
    projectId,
    region,
    state: j.state as VertexJobState,
    createTime: j.createTime,
    startTime: j.startTime,
    endTime: j.endTime,
    updateTime: j.updateTime,
    durationSeconds,
    labels: j.labels ?? {},
    triggerSource: j.labels?.['trigger-source'] ?? j.labels?.['trigger'] ?? '',
    error: j.error ? { code: j.error.code, message: j.error.message } : undefined,
    serviceAccount: j.serviceAccount,
  };
}

function mapVertexJobDetail(j: VertexApiJob, projectId: string, region: string): VertexJobDetail {
  return {
    ...mapVertexJob(j, projectId, region),
    parameters: j.runtimeConfig?.parameters ?? {},
    stateHistory: j.stateHistory?.map((h) => ({
      state: h.state as VertexJobState,
      timestamp: h.time,
      message: h.message,
    })) ?? [],
    artifactUri: j.runtimeConfig?.gcsOutputDirectory,
    logUri: j.pipelineRunContext?.name,
    modelResourceName: undefined,
  };
}

// ── Live implementations ───────────────────────────────────────────────────

async function fetchVertexJobsLive(filter?: VertexJobsFilter): Promise<VertexJob[]> {
  if (GCP_PROJECTS.length === 0) {
    throw new Error('Set GCP_PROJECTS (comma-separated) to use live Vertex AI data');
  }

  const token = await getAccessToken();
  const projects = filter?.projectId ? [filter.projectId] : GCP_PROJECTS;
  const regions = filter?.region ? [filter.region] : GCP_REGIONS;
  const allJobs: VertexJob[] = [];

  await Promise.all(
    projects.flatMap((projectId) =>
      regions.map(async (region) => {
        let pageToken = '';
        do {
          const url = new URL(
            `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/pipelineJobs`
          );
          url.searchParams.set('pageSize', '100');
          if (filter?.state) url.searchParams.set('filter', `state="${filter.state}"`);
          if (pageToken) url.searchParams.set('pageToken', pageToken);

          const data = await vertexGet<VertexApiListResponse>(url.toString(), token).catch(
            () => ({ pipelineJobs: [], nextPageToken: '' } as VertexApiListResponse)
          );
          allJobs.push(...(data.pipelineJobs ?? []).map((j) => mapVertexJob(j, projectId, region)));
          pageToken = data.nextPageToken ?? '';
        } while (pageToken);
      })
    )
  );

  // Client-side filters not supported by the API filter param
  let result = allJobs;
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (j) => j.displayName.toLowerCase().includes(q) || j.pipelineName.toLowerCase().includes(q)
    );
  }
  if (filter?.startAfter) {
    const after = new Date(filter.startAfter);
    result = result.filter((j) => j.startTime && new Date(j.startTime) >= after);
  }
  if (filter?.startBefore) {
    const before = new Date(filter.startBefore);
    result = result.filter((j) => j.startTime && new Date(j.startTime) <= before);
  }
  return result;
}

async function fetchVertexJobByIdLive(id: string): Promise<VertexJobDetail | null> {
  const token = await getAccessToken();

  // id is the full resource name: projects/{proj}/locations/{region}/pipelineJobs/{jobId}
  // Parse region from the resource name for the correct regional endpoint
  const parts = id.split('/');
  const projectId = parts[1] ?? GCP_PROJECTS[0] ?? '';
  const region = parts[3] ?? GCP_REGIONS[0] ?? 'us-central1';

  const data = await vertexGet<VertexApiJob>(
    `https://${region}-aiplatform.googleapis.com/v1/${id}`,
    token
  ).catch(() => null);

  return data ? mapVertexJobDetail(data, projectId, region) : null;
}

// ── Vertex AI API response shapes (internal) ──────────────────────────────

interface VertexApiListResponse {
  pipelineJobs?: VertexApiJob[];
  nextPageToken?: string;
}

interface VertexApiJob {
  name: string;
  displayName: string;
  state: string;
  createTime: string;
  startTime?: string;
  endTime?: string;
  updateTime: string;
  labels?: Record<string, string>;
  serviceAccount?: string;
  templateUri?: string;
  error?: { code: number; message: string };
  pipelineSpec?: { pipelineInfo?: { name: string } };
  runtimeConfig?: { parameters?: Record<string, unknown>; gcsOutputDirectory?: string };
  pipelineRunContext?: { name: string };
  stateHistory?: Array<{ state: string; time: string; message?: string }>;
}

// ── Public exports ─────────────────────────────────────────────────────────

export const fetchVertexJobs = USE_MOCK_MLOPS ? fetchVertexJobsMock : fetchVertexJobsLive;
export const fetchVertexJobById = USE_MOCK_MLOPS ? fetchVertexJobByIdMock : fetchVertexJobByIdLive;
