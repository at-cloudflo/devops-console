import * as vertexAdapter from '../adapters/vertex-ai.adapter';
import * as cacheService from '../cache/cache.service';
import { VertexJob, VertexJobDetail, VertexJobsFilter, VertexJobsSummary } from '../models/mlops.model';

const CACHE_TTL_VERTEX = 60_000;

export async function getVertexJobs(
  filter?: VertexJobsFilter,
  forceRefresh = false
): Promise<VertexJob[]> {
  if (!forceRefresh && !cacheService.isCacheStale('vertexJobs', CACHE_TTL_VERTEX)) {
    let cached = cacheService.getCache('vertexJobs') ?? [];
    return applyFilter(cached, filter);
  }
  const allJobs = await vertexAdapter.fetchVertexJobs();
  cacheService.setCache('vertexJobs', allJobs);
  return applyFilter(allJobs, filter);
}

export async function getVertexJobById(id: string): Promise<VertexJobDetail | null> {
  return vertexAdapter.fetchVertexJobById(id);
}

export async function getVertexJobsSummary(): Promise<VertexJobsSummary> {
  const jobs = await getVertexJobs();
  const running = jobs.filter((j) => j.state === 'PIPELINE_STATE_RUNNING').length;
  const succeeded = jobs.filter((j) => j.state === 'PIPELINE_STATE_SUCCEEDED').length;
  const failed = jobs.filter((j) => j.state === 'PIPELINE_STATE_FAILED').length;
  const queued = jobs.filter(
    (j) => j.state === 'PIPELINE_STATE_QUEUED' || j.state === 'PIPELINE_STATE_PENDING'
  ).length;

  const completedWithDuration = jobs.filter(
    (j) => j.durationSeconds !== undefined && j.durationSeconds > 0
  );
  const avgDuration =
    completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, j) => sum + (j.durationSeconds ?? 0), 0) /
        completedWithDuration.length
      : 0;

  return {
    total: jobs.length,
    running,
    succeeded,
    failed,
    queued,
    avgDurationSeconds: Math.round(avgDuration),
  };
}

function applyFilter(jobs: VertexJob[], filter?: VertexJobsFilter): VertexJob[] {
  if (!filter) return jobs;
  let result = [...jobs];
  if (filter.projectId) result = result.filter((j) => j.projectId === filter.projectId);
  if (filter.region) result = result.filter((j) => j.region === filter.region);
  if (filter.state) result = result.filter((j) => j.state === filter.state);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (j) =>
        j.displayName.toLowerCase().includes(q) ||
        j.pipelineName.toLowerCase().includes(q)
    );
  }
  return result;
}
