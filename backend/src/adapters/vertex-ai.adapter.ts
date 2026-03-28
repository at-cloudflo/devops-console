import path from 'path';
import fs from 'fs';
import { VertexJob, VertexJobDetail, VertexJobsFilter } from '../models/mlops.model';

/**
 * Vertex AI Adapter
 *
 * In production, this adapter would call the Vertex AI REST API or use
 * the Google Cloud client library. For the POC, it reads from mock JSON files.
 *
 * To integrate with real Vertex AI:
 * 1. Install: @google-cloud/aiplatform
 * 2. Authenticate via GOOGLE_APPLICATION_CREDENTIALS env var
 * 3. Use PipelineServiceClient to list pipeline jobs:
 *    client.listPipelineJobs({ parent: `projects/${projectId}/locations/${region}` })
 * 4. Handle pagination and multiple projects/regions in parallel
 */

function loadMockData<T>(filename: string): T {
  const filePath = path.join(__dirname, '../data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function simulateDelay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchVertexJobs(filter?: VertexJobsFilter): Promise<VertexJob[]> {
  await simulateDelay(45);
  let jobs = loadMockData<VertexJobDetail[]>('mock-vertex-jobs.json');

  if (filter?.projectId) {
    jobs = jobs.filter((j) => j.projectId === filter.projectId);
  }
  if (filter?.region) {
    jobs = jobs.filter((j) => j.region === filter.region);
  }
  if (filter?.state) {
    jobs = jobs.filter((j) => j.state === filter.state);
  }
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
      (j) =>
        j.displayName.toLowerCase().includes(q) ||
        j.pipelineName.toLowerCase().includes(q)
    );
  }

  // Strip detail fields when returning list
  return jobs.map(({ parameters: _p, stateHistory: _s, ...job }) => job as VertexJob);
}

export async function fetchVertexJobById(id: string): Promise<VertexJobDetail | null> {
  await simulateDelay(30);
  const jobs = loadMockData<VertexJobDetail[]>('mock-vertex-jobs.json');
  return jobs.find((j) => j.id === id) ?? null;
}
