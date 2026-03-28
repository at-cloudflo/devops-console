export type VertexJobState =
  | 'PIPELINE_STATE_QUEUED'
  | 'PIPELINE_STATE_PENDING'
  | 'PIPELINE_STATE_RUNNING'
  | 'PIPELINE_STATE_SUCCEEDED'
  | 'PIPELINE_STATE_FAILED'
  | 'PIPELINE_STATE_CANCELLING'
  | 'PIPELINE_STATE_CANCELLED'
  | 'PIPELINE_STATE_PAUSED';

export interface VertexJob {
  id: string;
  displayName: string;
  pipelineName: string;
  projectId: string;
  region: string;
  state: VertexJobState;
  createTime: string;   // ISO date
  startTime?: string;   // ISO date
  endTime?: string;     // ISO date
  updateTime: string;   // ISO date
  durationSeconds?: number;
  labels: Record<string, string>;
  triggerSource: string;
  error?: {
    code: number;
    message: string;
  };
  networkSpec?: string;
  serviceAccount?: string;
}

export interface VertexJobDetail extends VertexJob {
  parameters: Record<string, unknown>;
  stateHistory: Array<{
    state: VertexJobState;
    timestamp: string;
    message?: string;
  }>;
  artifactUri?: string;
  logUri?: string;
  modelResourceName?: string;
}

export interface VertexJobsFilter {
  projectId?: string;
  region?: string;
  state?: VertexJobState;
  startAfter?: string;
  startBefore?: string;
  search?: string;
}

export interface VertexJobsSummary {
  total: number;
  running: number;
  succeeded: number;
  failed: number;
  queued: number;
  avgDurationSeconds: number;
}
