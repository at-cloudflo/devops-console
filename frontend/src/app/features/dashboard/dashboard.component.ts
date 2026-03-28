import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { RefreshIntervalService } from '../../core/refresh/refresh-interval.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DashboardSummary } from '../../models/common.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, LoadingSpinnerComponent, StatusBadgeComponent],
  template: `
    <div class="page-header">
      <div class="page-header-content">
        <h1>Dashboard</h1>
        <p>Operational overview of your DevOps and MLOps infrastructure</p>
      </div>
    </div>

    @if (summaryQuery.isPending()) {
      <app-loading-spinner message="Loading dashboard..."></app-loading-spinner>
    } @else if (summaryQuery.isError()) {
      <div class="error-state">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load dashboard</h5>
        <p>{{ summaryQuery.error().message }}</p>
        <button class="btn btn-sm btn-primary mt-2" (click)="summaryQuery.refetch()">Retry</button>
      </div>
    } @else if (summaryQuery.data(); as data) {

      <!-- System Status Banner -->
      @if (data.systemStatus !== 'healthy') {
        <div class="alert mb-4 d-flex align-items-center gap-2"
          [ngClass]="data.systemStatus === 'degraded' ? 'alert-danger' : 'alert-warning'"
          style="border-radius:8px;"
        >
          <i class="bi bi-exclamation-triangle-fill"></i>
          <strong>System Status: {{ data.systemStatus | titlecase }}</strong>
          &nbsp;—&nbsp;
          {{ data.criticalAlerts }} critical alert(s) active. Review the Alerts page for details.
        </div>
      }

      <!-- Summary Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Agent Pools"
            [value]="data.totalPools"
            icon="bi-collection-fill"
            color="primary"
            [subtext]="data.poolsWarning + ' warning, ' + data.poolsCritical + ' critical'"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Total Agents"
            [value]="data.totalAgents"
            icon="bi-cpu-fill"
            color="info"
            [subtext]="data.offlineAgents + ' offline'"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Offline Agents"
            [value]="data.offlineAgents"
            icon="bi-wifi-off"
            [color]="data.offlineAgents > 0 ? 'danger' : 'success'"
            [subtext]="data.offlineAgents > 0 ? 'Requires attention' : 'All agents healthy'"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Critical Alerts"
            [value]="data.criticalAlerts"
            icon="bi-bell-fill"
            [color]="data.criticalAlerts > 0 ? 'danger' : 'success'"
            [subtext]="data.totalAlerts + ' total open'"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Queued Jobs (6h)"
            [value]="data.queuedJobsLast6h"
            icon="bi-list-task"
            color="warning"
            [subtext]="data.runningJobs + ' running now'"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Pending Approvals"
            [value]="data.pendingApprovals"
            icon="bi-check2-square"
            [color]="data.pendingApprovals > 3 ? 'warning' : 'secondary'"
            subtext="Awaiting human review"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Vertex Running"
            [value]="data.vertexRunning"
            icon="bi-activity"
            color="primary"
            subtext="Active ML pipelines"
          ></app-stat-card>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <app-stat-card
            label="Vertex Failed"
            [value]="data.vertexFailed"
            icon="bi-x-octagon-fill"
            [color]="data.vertexFailed > 0 ? 'danger' : 'success'"
            subtext="Recent failures"
          ></app-stat-card>
        </div>
      </div>

      <!-- Second row: status + quick links -->
      <div class="row g-3">
        <!-- Pool Health Summary -->
        <div class="col-md-6 col-xl-4">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-collection-fill me-2 text-primary-brand"></i>Pool Health</h6>
              <a routerLink="/devops/pools" class="btn btn-sm btn-outline-secondary" style="font-size:11px">View All</a>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span style="font-size:13px">Healthy</span>
                <span class="fw-600" style="color:#10b981">{{ data.poolsHealthy }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span style="font-size:13px">Warning</span>
                <span class="fw-600" style="color:#f59e0b">{{ data.poolsWarning }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span style="font-size:13px">Critical</span>
                <span class="fw-600" style="color:#ef4444">{{ data.poolsCritical }}</span>
              </div>
              <div class="mt-3 pt-3" style="border-top:1px solid var(--dc-border-color)">
                <div class="d-flex gap-1" style="height:8px;border-radius:4px;overflow:hidden">
                  <div [style.width.%]="pct(data.poolsHealthy, data.totalPools)" style="background:#10b981"></div>
                  <div [style.width.%]="pct(data.poolsWarning, data.totalPools)" style="background:#f59e0b"></div>
                  <div [style.width.%]="pct(data.poolsCritical, data.totalPools)" style="background:#ef4444"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Status -->
        <div class="col-md-6 col-xl-4">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-shield-fill me-2 text-primary-brand"></i>System Status</h6>
            </div>
            <div class="card-body">
              <div class="d-flex align-items-center gap-3 mb-3">
                <div class="stat-icon rounded-circle"
                  style="width:48px;height:48px;border-radius:50%!important"
                  [style.background]="data.systemStatus === 'healthy' ? 'rgba(16,185,129,.1)' : data.systemStatus === 'warning' ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)'"
                >
                  <i class="bi"
                    [ngClass]="data.systemStatus === 'healthy' ? 'bi-check-circle-fill' : data.systemStatus === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'"
                    [style.color]="data.systemStatus === 'healthy' ? '#10b981' : data.systemStatus === 'warning' ? '#f59e0b' : '#ef4444'"
                    style="font-size:22px"
                  ></i>
                </div>
                <div>
                  <div class="fw-600" style="font-size:15px;color:var(--dc-text-primary)">
                    {{ data.systemStatus | titlecase }}
                  </div>
                  <div style="font-size:12px;color:var(--dc-text-muted)">Overall system health</div>
                </div>
              </div>
              <div class="d-flex flex-column gap-2" style="font-size:12.5px;">
                <div class="d-flex justify-content-between">
                  <span class="text-muted">API Backend</span>
                  <app-status-badge status="online" label="Operational"></app-status-badge>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Data Source</span>
                  <app-status-badge status="online" label="Mock (POC)"></app-status-badge>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Alert Engine</span>
                  <app-status-badge status="online" label="Active"></app-status-badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="col-xl-4">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-lightning-fill me-2 text-primary-brand"></i>Quick Links</h6>
            </div>
            <div class="card-body d-flex flex-column gap-2">
              @for (link of quickLinks; track link.route) {
                <a [routerLink]="link.route" class="d-flex align-items-center gap-3 p-2 rounded text-decoration-none"
                  style="transition:background .15s;color:var(--dc-text-primary)"
                  onmouseenter="this.style.background='rgba(142,33,87,.06)'"
                  onmouseleave="this.style.background=''"
                >
                  <div class="stat-icon rounded" style="width:34px;height:34px;background:var(--dc-primary-subtle)">
                    <i class="bi text-primary-brand" [ngClass]="link.icon" style="font-size:14px"></i>
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:500">{{ link.label }}</div>
                    <div style="font-size:11px;color:var(--dc-text-muted)">{{ link.desc }}</div>
                  </div>
                  <i class="bi bi-chevron-right ms-auto" style="font-size:11px;color:var(--dc-text-muted)"></i>
                </a>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DashboardComponent {
  private readonly api = inject(ApiClientService);
  private readonly refreshIntervalSvc = inject(RefreshIntervalService);

  readonly summaryQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => firstValueFrom(this.api.get<DashboardSummary>('/dashboard/summary')),
    staleTime: 30_000,
    refetchInterval: this.refreshIntervalSvc.interval(),
  }));

  readonly quickLinks = [
    { route: '/devops/pools', icon: 'bi-collection-fill', label: 'Agent Pools', desc: 'View pool health and availability' },
    { route: '/devops/agents', icon: 'bi-cpu-fill', label: 'Agents', desc: 'Monitor individual agent status' },
    { route: '/devops/approvals', icon: 'bi-check2-square', label: 'Approvals', desc: 'Review pending gate approvals' },
    { route: '/mlops/vertex-jobs', icon: 'bi-activity', label: 'Vertex Jobs', desc: 'Track ML pipeline executions' },
  ];

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString();
  }

  pct(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
