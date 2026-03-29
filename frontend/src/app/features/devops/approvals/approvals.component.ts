import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { RefreshIntervalService } from '../../../core/refresh/refresh-interval.service';
import { PendingApproval } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent, PaginatorComponent, LocalDatePipe],
  template: `
    <app-page-header
      title="Pending Approvals"
      subtitle="Pipeline stages and environments waiting for manual approval"
      [showRefresh]="true"
      [refreshing]="approvalsQuery.isFetching()"
      (onRefresh)="approvalsQuery.refetch()"
    ></app-page-header>

    <!-- Error toast -->
    @if (actionError()) {
      <div class="alert alert-danger d-flex align-items-center gap-2 mb-3" style="font-size:13px;border-radius:8px">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>{{ actionError() }}</span>
        <button type="button" class="btn-close ms-auto" style="font-size:11px" (click)="actionError.set(null)"></button>
      </div>
    }

    <!-- Success toast -->
    @if (actionSuccess()) {
      <div class="alert alert-success d-flex align-items-center gap-2 mb-3" style="font-size:13px;border-radius:8px">
        <i class="bi bi-check-circle-fill"></i>
        <span>{{ actionSuccess() }}</span>
      </div>
    }

    <div class="filters-bar">
      <div class="input-group input-group-sm" style="max-width:220px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" placeholder="Search..." [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()" />
      </div>
      <select class="form-select form-select-sm" style="max-width:160px" [(ngModel)]="projectFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Projects</option>
        @for (p of uniqueProjects(); track p) { <option [value]="p">{{ p }}</option> }
      </select>
      <div class="ms-auto" style="font-size:12px;color:var(--dc-text-muted)">
        {{ approvalsQuery.data()?.total ?? 0 }} pending
      </div>
    </div>

    @if (approvalsQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (approvalsQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load approvals</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="approvalsQuery.refetch()">Retry</button>
      </div>
    } @else {
      @if (filtered().length === 0) {
        <div class="empty-state card card-body">
          <i class="bi bi-check2-all"></i>
          <h5>No pending approvals</h5>
          <p>All pipeline stages have been approved or there are no active gates.</p>
        </div>
      } @else {
        <div class="d-flex flex-column gap-3">
          @for (approval of filtered(); track approval.id) {
            <div class="card" [class.border-danger]="approval.ageMinutes > 1440">
              <div class="card-body">
                <div class="row align-items-start">
                  <!-- Left: info -->
                  <div class="col-lg-8">
                    <div class="d-flex align-items-start gap-3">
                      <div class="stat-icon rounded" style="width:40px;height:40px;background:rgba(245,158,11,.12);color:#d97706;flex-shrink:0">
                        <i class="bi bi-shield-check" style="font-size:16px"></i>
                      </div>
                      <div class="flex-grow-1">
                        <div class="fw-600" style="font-size:14px">{{ approval.pipelineName }}</div>
                        <div style="font-size:12.5px;color:var(--dc-text-secondary);margin-top:2px">
                          <i class="bi bi-layers me-1"></i>{{ approval.stageName }}
                          <span class="mx-2">·</span>
                          <i class="bi bi-box me-1"></i>{{ approval.environmentName }}
                          <span class="mx-2">·</span>
                          <i class="bi bi-building me-1"></i>{{ approval.project }}
                        </div>
                        <div class="d-flex flex-wrap gap-1 mt-2">
                          @for (approver of approval.approvers; track approver) {
                            <span class="badge bg-secondary-subtle text-secondary" style="font-size:11px">
                              <i class="bi bi-person me-1"></i>{{ approver.split('@')[0] }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Right: age + actions -->
                  <div class="col-lg-4 mt-3 mt-lg-0 d-flex flex-column align-items-end gap-2">
                    <app-status-badge [status]="approval.status"></app-status-badge>
                    <div class="text-end" style="font-size:12px;">
                      <span
                        [class.text-danger]="approval.ageMinutes > 1440"
                        [class.text-warning]="approval.ageMinutes > 120 && approval.ageMinutes <= 1440"
                        class="fw-500"
                      >
                        <i class="bi bi-clock me-1"></i>{{ formatAge(approval.ageMinutes) }}
                      </span>
                      <div class="text-muted mt-1">since {{ approval.waitingSince | localDate }}</div>
                    </div>

                    <!-- Action buttons -->
                    @if (rejectPanelId() !== approval.id) {
                      <div class="d-flex gap-2 mt-1">
                        <button
                          class="btn btn-sm btn-success"
                          [disabled]="isActing(approval.id)"
                          (click)="approve(approval)"
                        >
                          @if (approvingId() === approval.id) {
                            <span class="spinner-border spinner-border-sm me-1"></span>
                          } @else {
                            <i class="bi bi-check2 me-1"></i>
                          }
                          Approve
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger"
                          [disabled]="isActing(approval.id)"
                          (click)="openRejectPanel(approval.id)"
                        >
                          <i class="bi bi-x me-1"></i>Reject
                        </button>
                      </div>
                    }

                    <!-- Reject panel -->
                    @if (rejectPanelId() === approval.id) {
                      <div class="reject-panel w-100">
                        <textarea
                          class="form-control form-control-sm mb-2"
                          rows="2"
                          placeholder="Rejection reason (optional)"
                          [(ngModel)]="rejectComment"
                          style="font-size:12px;resize:none"
                        ></textarea>
                        <div class="d-flex gap-2 justify-content-end">
                          <button
                            class="btn btn-sm btn-outline-secondary"
                            [disabled]="rejectingId() === approval.id"
                            (click)="cancelReject()"
                          >
                            Cancel
                          </button>
                          <button
                            class="btn btn-sm btn-danger"
                            [disabled]="rejectingId() === approval.id"
                            (click)="confirmReject(approval)"
                          >
                            @if (rejectingId() === approval.id) {
                              <span class="spinner-border spinner-border-sm me-1"></span>
                            } @else {
                              <i class="bi bi-x me-1"></i>
                            }
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        @if (approvalsQuery.data(); as resp) {
          <app-paginator
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="resp.total"
            [totalPages]="resp.totalPages"
            (pageChange)="page.set($event)"
            (pageSizeChange)="pageSize.set($event)"
          ></app-paginator>
        }
      }
    }
  `,
  styles: [`
    .border-danger { border-left: 3px solid #ef4444 !important; }
    .reject-panel { background: var(--dc-surface-alt, #f8f9fa); border-radius: 8px; padding: 10px; }
  `]
})
export class ApprovalsComponent {
  private readonly devopsApi = inject(DevopsApiService);
  private readonly refreshIntervalSvc = inject(RefreshIntervalService);

  searchTerm = '';
  projectFilter = '';
  rejectComment = '';

  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly approvingId = signal<string | null>(null);
  readonly rejectPanelId = signal<string | null>(null);
  readonly rejectingId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);

  readonly approvalsQuery = injectQuery(() => ({
    queryKey: ['devops', 'approvals', this.searchTerm, this.projectFilter, this.page(), this.pageSize()],
    queryFn: () => this.devopsApi.getApprovals({
      search: this.searchTerm || undefined,
      project: this.projectFilter || undefined,
      page: this.page(),
      limit: this.pageSize(),
    }),
    staleTime: 15_000,
    refetchInterval: this.refreshIntervalSvc.interval(),
  }));

  onFilterChange(): void { this.page.set(1); }

  filtered(): PendingApproval[] { return this.approvalsQuery.data()?.data ?? []; }

  uniqueProjects(): string[] {
    return [...new Set((this.approvalsQuery.data()?.data ?? []).map((a) => a.project))].sort();
  }

  isActing(id: string): boolean {
    return this.approvingId() === id || this.rejectingId() === id;
  }

  openRejectPanel(id: string): void {
    this.rejectComment = '';
    this.rejectPanelId.set(id);
    this.actionError.set(null);
  }

  cancelReject(): void {
    this.rejectPanelId.set(null);
    this.rejectComment = '';
  }

  approve(approval: PendingApproval): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.approvingId.set(approval.id);
    this.devopsApi.approveApproval(approval.id, approval.project).then(() => {
      this.approvingId.set(null);
      this.actionSuccess.set(`"${approval.pipelineName}" approved successfully.`);
      void this.approvalsQuery.refetch();
      setTimeout(() => this.actionSuccess.set(null), 4000);
    }).catch((err: unknown) => {
      this.approvingId.set(null);
      this.actionError.set(this.extractError(err));
    });
  }

  confirmReject(approval: PendingApproval): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.rejectingId.set(approval.id);
    this.devopsApi.rejectApproval(approval.id, approval.project, this.rejectComment || undefined).then(() => {
      this.rejectingId.set(null);
      this.rejectPanelId.set(null);
      this.rejectComment = '';
      this.actionSuccess.set(`"${approval.pipelineName}" rejected.`);
      void this.approvalsQuery.refetch();
      setTimeout(() => this.actionSuccess.set(null), 4000);
    }).catch((err: unknown) => {
      this.rejectingId.set(null);
      this.actionError.set(this.extractError(err));
    });
  }

  formatAge(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    if (h < 24) return `${h}h ${minutes % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  }

  private extractError(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { error?: string } }).error;
      return e?.error ?? 'Action failed. Please try again.';
    }
    return 'Action failed. Please try again.';
  }
}
