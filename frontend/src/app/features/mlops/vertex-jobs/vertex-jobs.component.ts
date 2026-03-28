import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { MlopsApiService } from '../mlops-api.service';
import { VertexJob, VertexJobDetail, VertexJobState } from '../../../models/mlops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-vertex-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header
      title="Vertex AI Jobs"
      subtitle="Monitor ML pipeline executions across GCP projects"
      [showRefresh]="true"
      [refreshing]="jobsQuery.isFetching()"
      (onRefresh)="refresh()"
    ></app-page-header>

    <!-- Summary cards -->
    @if (jobsQuery.data(); as resp) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <app-stat-card label="Running" [value]="resp.summary.running" icon="bi-activity" color="primary" subtext="Active pipelines"></app-stat-card>
        </div>
        <div class="col-6 col-md-3">
          <app-stat-card label="Succeeded" [value]="resp.summary.succeeded" icon="bi-check-circle-fill" color="success" subtext="Last 24h"></app-stat-card>
        </div>
        <div class="col-6 col-md-3">
          <app-stat-card label="Failed" [value]="resp.summary.failed" icon="bi-x-octagon-fill" [color]="resp.summary.failed > 0 ? 'danger' : 'success'" subtext="Recent failures"></app-stat-card>
        </div>
        <div class="col-6 col-md-3">
          <app-stat-card label="Avg Duration" [value]="formatDuration(resp.summary.avgDurationSeconds)" icon="bi-stopwatch" color="info" subtext="Completed jobs"></app-stat-card>
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="filters-bar">
      <div class="input-group input-group-sm" style="max-width:220px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" placeholder="Search jobs..." [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()" />
      </div>
      <select class="form-select form-select-sm" style="max-width:180px" [(ngModel)]="projectFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Projects</option>
        @for (p of uniqueProjects(); track p) {
          <option [value]="p">{{ p }}</option>
        }
      </select>
      <select class="form-select form-select-sm" style="max-width:150px" [(ngModel)]="regionFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Regions</option>
        @for (r of uniqueRegions(); track r) {
          <option [value]="r">{{ r }}</option>
        }
      </select>
      <select class="form-select form-select-sm" style="max-width:170px" [(ngModel)]="stateFilter" (ngModelChange)="onFilterChange()">
        <option value="">All States</option>
        <option value="PIPELINE_STATE_RUNNING">Running</option>
        <option value="PIPELINE_STATE_SUCCEEDED">Succeeded</option>
        <option value="PIPELINE_STATE_FAILED">Failed</option>
        <option value="PIPELINE_STATE_QUEUED">Queued</option>
        <option value="PIPELINE_STATE_CANCELLED">Cancelled</option>
      </select>
      <div class="ms-auto" style="font-size:12px;color:var(--dc-text-muted)">
        {{ filtered().length }} jobs
      </div>
    </div>

    @if (jobsQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (jobsQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load Vertex jobs</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="refresh()">Retry</button>
      </div>
    } @else if (filtered().length === 0) {
      <div class="empty-state card card-body">
        <i class="bi bi-cpu"></i>
        <h5>No jobs found</h5>
        <p>No pipeline executions match the current filters.</p>
      </div>
    } @else {
      <div class="card">
        <div class="dc-table-container">
          <table class="dc-table table table-hover mb-0">
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Pipeline</th>
                <th>Project</th>
                <th>Region</th>
                <th>State</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Trigger</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (job of filtered(); track job.id) {
                <tr>
                  <td>
                    <div class="fw-500 truncate" style="max-width:200px" [title]="job.displayName">{{ job.displayName }}</div>
                    <div class="font-mono text-muted" style="font-size:10.5px">{{ shortId(job.id) }}</div>
                  </td>
                  <td>
                    <span class="text-muted" style="font-size:12.5px">{{ job.pipelineName }}</span>
                  </td>
                  <td>
                    <span class="badge bg-secondary-subtle text-secondary" style="font-size:11px">{{ job.projectId }}</span>
                  </td>
                  <td style="font-size:12px;color:var(--dc-text-muted)">{{ job.region }}</td>
                  <td>
                    <app-status-badge [status]="normalizeState(job.state)"></app-status-badge>
                  </td>
                  <td style="font-size:12px;color:var(--dc-text-muted)">
                    {{ job.startTime ? formatRelativeTime(job.startTime) : '—' }}
                  </td>
                  <td style="font-size:12px">
                    {{ job.durationSeconds != null ? formatDuration(job.durationSeconds) : isRunning(job.state) ? runningDuration(job.startTime) : '—' }}
                  </td>
                  <td>
                    @if (job.triggerSource) {
                      <span class="badge bg-info-subtle text-info" style="font-size:11px">{{ job.triggerSource }}</span>
                    }
                  </td>
                  <td>
                    <button
                      class="btn btn-sm btn-icon btn-outline-secondary"
                      (click)="toggleDetail(job.id)"
                      title="View details"
                    >
                      <i class="bi" [ngClass]="selectedJobId() === job.id ? 'bi-x' : 'bi-info-circle'"></i>
                    </button>
                  </td>
                </tr>

                <!-- Inline detail panel -->
                @if (selectedJobId() === job.id) {
                  <tr>
                    <td colspan="9" style="background:var(--dc-page-bg);padding:0">
                      <div class="p-4">
                        @if (detailQuery.isPending()) {
                          <app-loading-spinner minHeight="60px"></app-loading-spinner>
                        } @else if (detailQuery.data()?.data; as detail) {
                          <div class="row g-4">
                            <!-- Meta -->
                            <div class="col-md-4">
                              <h6 class="text-muted mb-3" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Job Metadata</h6>
                              <div class="d-flex flex-column gap-2" style="font-size:12.5px">
                                <div><span class="text-muted">Full ID:</span> <span class="font-mono ms-2" style="font-size:11px">{{ detail.id }}</span></div>
                                <div><span class="text-muted">Project:</span> <span class="ms-2">{{ detail.projectId }}</span></div>
                                <div><span class="text-muted">Region:</span> <span class="ms-2">{{ detail.region }}</span></div>
                                <div><span class="text-muted">Created:</span> <span class="ms-2">{{ formatDate(detail.createTime) }}</span></div>
                                @if (detail.startTime) {
                                  <div><span class="text-muted">Started:</span> <span class="ms-2">{{ formatDate(detail.startTime) }}</span></div>
                                }
                                @if (detail.endTime) {
                                  <div><span class="text-muted">Ended:</span> <span class="ms-2">{{ formatDate(detail.endTime) }}</span></div>
                                }
                                @if (detail.error) {
                                  <div class="mt-2 p-2 rounded" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15)">
                                    <div class="text-danger fw-600" style="font-size:12px">Error {{ detail.error.code }}</div>
                                    <div class="text-muted" style="font-size:11.5px">{{ detail.error.message }}</div>
                                  </div>
                                }
                              </div>
                            </div>

                            <!-- Labels -->
                            <div class="col-md-4">
                              <h6 class="text-muted mb-3" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Labels</h6>
                              <div class="d-flex flex-wrap gap-1">
                                @for (entry of objectEntries(detail.labels); track entry[0]) {
                                  <span class="badge bg-secondary-subtle text-secondary" style="font-size:11px">
                                    {{ entry[0] }}: {{ entry[1] }}
                                  </span>
                                }
                                @if (objectEntries(detail.labels).length === 0) {
                                  <span class="text-muted" style="font-size:12px">No labels</span>
                                }
                              </div>

                              <h6 class="text-muted mb-2 mt-3" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">State History</h6>
                              <div class="d-flex flex-column gap-1">
                                @for (h of detail.stateHistory; track h.timestamp) {
                                  <div class="d-flex align-items-center gap-2" style="font-size:12px">
                                    <app-status-badge [status]="normalizeState(h.state)"></app-status-badge>
                                    <span class="text-muted">{{ formatDate(h.timestamp) }}</span>
                                  </div>
                                }
                              </div>
                            </div>

                            <!-- Links & params -->
                            <div class="col-md-4">
                              <h6 class="text-muted mb-3" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Resources</h6>
                              <div class="d-flex flex-column gap-2" style="font-size:12.5px">
                                @if (detail.logUri) {
                                  <div>
                                    <span class="text-muted">Logs:</span>
                                    <span class="badge bg-secondary-subtle text-secondary ms-2" style="font-size:10.5px">
                                      <i class="bi bi-lock me-1"></i>GCP Console (not linked in POC)
                                    </span>
                                  </div>
                                }
                                @if (detail.artifactUri) {
                                  <div>
                                    <span class="text-muted">Artifacts:</span>
                                    <span class="badge bg-secondary-subtle text-secondary ms-2" style="font-size:10.5px">
                                      <i class="bi bi-lock me-1"></i>GCS URI (not linked in POC)
                                    </span>
                                  </div>
                                }
                                @if (detail.modelResourceName) {
                                  <div>
                                    <span class="text-muted">Model:</span>
                                    <span class="font-mono ms-2" style="font-size:11px">{{ shortId(detail.modelResourceName) }}</span>
                                  </div>
                                }
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
})
export class VertexJobsComponent {
  private readonly mlopsApi = inject(MlopsApiService);
  readonly selectedJobId = signal<string | null>(null);

  searchTerm = '';
  projectFilter = '';
  regionFilter = '';
  stateFilter = '';

  readonly jobsQuery = injectQuery(() => ({
    queryKey: ['mlops', 'vertex', 'jobs', this.projectFilter, this.regionFilter, this.stateFilter, this.searchTerm],
    queryFn: () => this.mlopsApi.getVertexJobs({
      projectId: this.projectFilter || undefined,
      region: this.regionFilter || undefined,
      state: this.stateFilter || undefined,
      search: this.searchTerm || undefined,
    }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  }));

  readonly detailQuery = injectQuery(() => ({
    queryKey: ['mlops', 'vertex', 'job', this.selectedJobId()],
    queryFn: () => this.mlopsApi.getVertexJobById(this.selectedJobId()!),
    enabled: this.selectedJobId() !== null,
    staleTime: 60_000,
  }));

  onFilterChange(): void {
    // Query key reactivity handles the refetch automatically
  }

  refresh(): void {
    void this.jobsQuery.refetch();
  }

  filtered(): VertexJob[] {
    return this.jobsQuery.data()?.data ?? [];
  }

  uniqueProjects(): string[] {
    return [...new Set((this.jobsQuery.data()?.data ?? []).map((j) => j.projectId))].sort();
  }

  uniqueRegions(): string[] {
    return [...new Set((this.jobsQuery.data()?.data ?? []).map((j) => j.region))].sort();
  }

  toggleDetail(id: string): void {
    this.selectedJobId.update((cur) => (cur === id ? null : id));
  }

  normalizeState(state: VertexJobState): string {
    return state.replace('PIPELINE_STATE_', '').toLowerCase();
  }

  isRunning(state: VertexJobState): boolean {
    return state === 'PIPELINE_STATE_RUNNING';
  }

  runningDuration(startTime?: string): string {
    if (!startTime) return '—';
    return this.formatDuration(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m ${seconds % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  shortId(id: string): string {
    const parts = id.split('/');
    return parts[parts.length - 1] ?? id;
  }

  objectEntries(obj: Record<string, string>): [string, string][] {
    return Object.entries(obj);
  }
}
