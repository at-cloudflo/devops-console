import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { QueueJob } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent, StatCardComponent],
  template: `
    <app-page-header
      title="Job Queue"
      subtitle="Azure DevOps pipeline queue status and history"
      [showRefresh]="true"
      [refreshing]="queueQuery.isFetching()"
      (onRefresh)="queueQuery.refetch()"
    ></app-page-header>

    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3">
        <app-stat-card label="Queued" [value]="countByStatus('queued')" icon="bi-hourglass-split" color="warning"></app-stat-card>
      </div>
      <div class="col-6 col-md-3">
        <app-stat-card label="Running" [value]="countByStatus('running')" icon="bi-play-circle-fill" color="primary"></app-stat-card>
      </div>
      <div class="col-6 col-md-3">
        <app-stat-card label="Completed" [value]="countByStatus('completed')" icon="bi-check-circle-fill" color="success"></app-stat-card>
      </div>
      <div class="col-6 col-md-3">
        <app-stat-card label="Failed" [value]="countByStatus('failed')" icon="bi-x-circle-fill" color="danger"></app-stat-card>
      </div>
    </div>

    <div class="filters-bar">
      <div class="input-group input-group-sm" style="max-width:200px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" placeholder="Search..." [(ngModel)]="searchTerm" />
      </div>
      <select class="form-select form-select-sm" style="max-width:150px" [(ngModel)]="statusFilter">
        <option value="">All Statuses</option>
        <option value="queued">Queued</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
      <select class="form-select form-select-sm" style="max-width:140px" [(ngModel)]="sinceHours" (change)="queueQuery.refetch()">
        <option [value]="3">Last 3h</option>
        <option [value]="6">Last 6h</option>
        <option [value]="12">Last 12h</option>
        <option [value]="24">Last 24h</option>
      </select>
      <div class="ms-auto" style="font-size:12px;color:var(--dc-text-muted)">
        {{ filtered().length }} jobs
      </div>
    </div>

    @if (queueQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (queueQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load queue</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="queueQuery.refetch()">Retry</button>
      </div>
    } @else {
      <div class="card">
        <div class="dc-table-container">
          <table class="dc-table table table-hover mb-0">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Pipeline</th>
                <th>Project</th>
                <th>Pool</th>
                <th>Requested By</th>
                <th>Requested At</th>
                <th>Queue Time</th>
                <th>Status</th>
                <th>Approval</th>
              </tr>
            </thead>
            <tbody>
              @for (job of filtered(); track job.id) {
                <tr [class.table-warning]="job.status === 'queued' && job.queueDurationSeconds > 3600">
                  <td><span class="font-mono text-muted">{{ job.jobId }}</span></td>
                  <td>
                    <div class="fw-500">{{ job.pipelineName }}</div>
                  </td>
                  <td class="text-muted" style="font-size:12.5px">{{ job.project }}</td>
                  <td class="text-muted" style="font-size:12px">{{ job.pool }}</td>
                  <td style="font-size:12px">{{ shortEmail(job.requestedBy) }}</td>
                  <td style="font-size:12px;color:var(--dc-text-muted)">{{ formatDate(job.requestedAt) }}</td>
                  <td style="font-size:12px">
                    <span [class.text-danger]="job.queueDurationSeconds > 3600" [class.text-warning]="job.queueDurationSeconds > 1800 && job.queueDurationSeconds <= 3600">
                      {{ formatDuration(job.queueDurationSeconds) }}
                    </span>
                  </td>
                  <td><app-status-badge [status]="job.status"></app-status-badge></td>
                  <td>
                    @if (job.approvalRequired) {
                      <span class="badge bg-warning-subtle text-warning" style="font-size:10.5px">
                        <i class="bi bi-shield-check me-1"></i>Required
                      </span>
                    } @else {
                      <span class="text-muted" style="font-size:12px">—</span>
                    }
                  </td>
                </tr>
              }
              @if (filtered().length === 0) {
                <tr><td colspan="9"><div class="empty-state"><i class="bi bi-list-task"></i><h5>No jobs found</h5><p>No jobs in the selected time range.</p></div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `
})
export class QueueComponent {
  private readonly devopsApi = inject(DevopsApiService);
  searchTerm = '';
  statusFilter = '';
  sinceHours = 6;

  readonly queueQuery = injectQuery(() => ({
    queryKey: ['devops', 'queue', this.sinceHours],
    queryFn: () => this.devopsApi.getQueue({ sinceHours: this.sinceHours }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  }));

  filtered(): QueueJob[] {
    let jobs = this.queueQuery.data()?.data ?? [];
    if (this.statusFilter) jobs = jobs.filter((j) => j.status === this.statusFilter);
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      jobs = jobs.filter((j) => j.pipelineName.toLowerCase().includes(q) || j.project.toLowerCase().includes(q));
    }
    return jobs.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  countByStatus(status: string): number {
    return (this.queueQuery.data()?.data ?? []).filter((j) => j.status === status).length;
  }

  shortEmail(email: string): string {
    return email.split('@')[0];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}
