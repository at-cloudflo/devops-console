import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { RefreshIntervalService } from '../../../core/refresh/refresh-interval.service';
import { QueueJob } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent, StatCardComponent, PaginatorComponent, DurationPipe, LocalDatePipe],
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
        <input type="text" class="form-control" placeholder="Search..." [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()" />
      </div>
      <select class="form-select form-select-sm" style="max-width:150px" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Statuses</option>
        <option value="queued">Queued</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
      <select class="form-select form-select-sm" style="max-width:140px" [(ngModel)]="sinceHours" (ngModelChange)="onFilterChange()">
        <option [value]="3">Last 3h</option>
        <option [value]="6">Last 6h</option>
        <option [value]="12">Last 12h</option>
        <option [value]="24">Last 24h</option>
      </select>
      <div class="ms-auto" style="font-size:12px;color:var(--dc-text-muted)">
        {{ queueQuery.data()?.total ?? 0 }} jobs
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
                  <td style="font-size:12px;color:var(--dc-text-muted)">{{ job.requestedAt | localDate }}</td>
                  <td style="font-size:12px">
                    <span [class.text-danger]="job.queueDurationSeconds > 3600" [class.text-warning]="job.queueDurationSeconds > 1800 && job.queueDurationSeconds <= 3600">
                      {{ job.queueDurationSeconds | duration }}
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
        @if (queueQuery.data(); as resp) {
          <app-paginator
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="resp.total"
            [totalPages]="resp.totalPages"
            (pageChange)="page.set($event)"
            (pageSizeChange)="pageSize.set($event)"
          ></app-paginator>
        }
      </div>
    }
  `
})
export class QueueComponent {
  private readonly devopsApi = inject(DevopsApiService);
  private readonly refreshIntervalSvc = inject(RefreshIntervalService);
  searchTerm = '';
  statusFilter = '';
  sinceHours = 6;
  readonly page = signal(1);
  readonly pageSize = signal(25);

  readonly queueQuery = injectQuery(() => ({
    queryKey: ['devops', 'queue', this.sinceHours, this.statusFilter, this.searchTerm, this.page(), this.pageSize()],
    queryFn: () => this.devopsApi.getQueue({
      sinceHours: this.sinceHours,
      status: this.statusFilter || undefined,
      search: this.searchTerm || undefined,
      page: this.page(),
      limit: this.pageSize(),
    }),
    staleTime: 15_000,
    refetchInterval: this.refreshIntervalSvc.interval(),
  }));

  onFilterChange(): void {
    this.page.set(1);
  }

  filtered(): QueueJob[] {
    return this.queueQuery.data()?.data ?? [];
  }

  countByStatus(status: string): number {
    return this.filtered().filter((j) => j.status === status).length;
  }

  shortEmail(email: string): string {
    return email.split('@')[0];
  }
}
