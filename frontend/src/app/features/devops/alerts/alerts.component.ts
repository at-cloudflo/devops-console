import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { Alert, AlertSeverity, AlertStatus } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header
      title="Alerts"
      subtitle="Active infrastructure alerts from pools, agents, queue, and approvals"
      [showRefresh]="true"
      [refreshing]="alertsQuery.isFetching()"
      (onRefresh)="alertsQuery.refetch()"
    ></app-page-header>

    <!-- Summary bar -->
    @if (alertsQuery.data()?.data; as alerts) {
      <div class="row g-2 mb-3">
        <div class="col-auto">
          <div class="badge badge-severity-critical py-2 px-3" style="font-size:12px">
            <i class="bi bi-x-circle me-1"></i>
            {{ countBySeverity(alerts, 'critical') }} Critical
          </div>
        </div>
        <div class="col-auto">
          <div class="badge badge-severity-warning py-2 px-3" style="font-size:12px">
            <i class="bi bi-exclamation-triangle me-1"></i>
            {{ countBySeverity(alerts, 'warning') }} Warning
          </div>
        </div>
        <div class="col-auto">
          <div class="badge badge-severity-info py-2 px-3" style="font-size:12px">
            <i class="bi bi-info-circle me-1"></i>
            {{ countBySeverity(alerts, 'info') }} Info
          </div>
        </div>
        <div class="col-auto">
          <div class="badge bg-secondary-subtle text-secondary py-2 px-3" style="font-size:12px">
            {{ countByStatus(alerts, 'acknowledged') }} Acknowledged
          </div>
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="filters-bar">
      <div class="input-group input-group-sm" style="max-width:220px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" placeholder="Search alerts..." [(ngModel)]="searchTerm" />
      </div>
      <select class="form-select form-select-sm" style="max-width:150px" [(ngModel)]="severityFilter">
        <option value="">All Severities</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
      <select class="form-select form-select-sm" style="max-width:160px" [(ngModel)]="statusFilter">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="resolved">Resolved</option>
      </select>
      <div class="ms-auto" style="font-size:12px;color:var(--dc-text-muted)">
        {{ filtered().length }} alerts
      </div>
    </div>

    @if (alertsQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (alertsQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load alerts</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="alertsQuery.refetch()">Retry</button>
      </div>
    } @else if (filtered().length === 0) {
      <div class="empty-state card card-body">
        <i class="bi bi-bell-slash"></i>
        <h5>No alerts found</h5>
        <p>{{ allAlerts().length === 0 ? 'All systems are healthy.' : 'No alerts match the current filter.' }}</p>
      </div>
    } @else {
      <div class="d-flex flex-column gap-2">
        @for (alert of filtered(); track alert.id) {
          <div class="card alert-card"
            [class.border-critical]="alert.severity === 'critical' && alert.status === 'open'"
            [class.border-warning]="alert.severity === 'warning' && alert.status === 'open'"
            [class.opacity-75]="alert.status !== 'open'"
          >
            <div class="card-body" style="padding: 14px 20px">
              <div class="d-flex align-items-start justify-content-between gap-3">
                <!-- Left: icon + info -->
                <div class="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
                  <div class="alert-icon mt-1" [ngClass]="iconClass(alert.severity)">
                    <i class="bi" [ngClass]="severityIcon(alert.severity)"></i>
                  </div>
                  <div class="min-w-0 flex-grow-1">
                    <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <span class="fw-600" style="font-size:13.5px;color:var(--dc-text-primary)">{{ alert.message }}</span>
                      <app-status-badge [status]="alert.severity" [label]="capitalize(alert.severity)"></app-status-badge>
                      @if (alert.status !== 'open') {
                        <app-status-badge [status]="alert.status" [label]="capitalize(alert.status)"></app-status-badge>
                      }
                    </div>
                    <div class="d-flex flex-wrap gap-3" style="font-size:12px;color:var(--dc-text-muted)">
                      <span><i class="bi bi-tag me-1"></i>{{ humanizeType(alert.type) }}</span>
                      <span><i class="bi bi-hdd-stack me-1"></i>{{ alert.source }}</span>
                      <span><i class="bi bi-clock me-1"></i>{{ formatRelativeTime(alert.startedAt) }}</span>
                      @if (alert.acknowledged && alert.acknowledgedBy) {
                        <span class="text-success"><i class="bi bi-check me-1"></i>Acknowledged by {{ alert.acknowledgedBy }}</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Right: actions -->
                <div class="d-flex gap-2 flex-shrink-0">
                  @if (alert.status === 'open') {
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      style="font-size:12px"
                      [disabled]="acknowledging() === alert.id"
                      (click)="acknowledge(alert.id)"
                      title="Acknowledge alert"
                    >
                      @if (acknowledging() === alert.id) {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        <i class="bi bi-check-lg me-1"></i>Acknowledge
                      }
                    </button>
                  }
                  <button
                    class="btn btn-sm btn-icon btn-outline-secondary"
                    (click)="toggleExpanded(alert.id)"
                    title="Details"
                  >
                    <i class="bi" [ngClass]="isExpanded(alert.id) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                  </button>
                </div>
              </div>

              <!-- Expanded detail -->
              @if (isExpanded(alert.id)) {
                <div class="mt-3 pt-3" style="border-top:1px solid var(--dc-border-color)">
                  <div class="row g-3" style="font-size:12.5px">
                    <div class="col-md-6">
                      <div class="d-flex flex-column gap-2">
                        <div><span class="text-muted">Alert ID:</span> <span class="font-mono ms-2">{{ alert.id }}</span></div>
                        <div><span class="text-muted">Source ID:</span> <span class="font-mono ms-2">{{ alert.sourceId }}</span></div>
                        <div><span class="text-muted">Type:</span> <span class="ms-2">{{ humanizeType(alert.type) }}</span></div>
                        <div><span class="text-muted">Started at:</span> <span class="ms-2">{{ formatDate(alert.startedAt) }}</span></div>
                        <div><span class="text-muted">Updated at:</span> <span class="ms-2">{{ formatDate(alert.updatedAt) }}</span></div>
                        @if (alert.resolvedAt) {
                          <div><span class="text-muted">Resolved at:</span> <span class="ms-2 text-success">{{ formatDate(alert.resolvedAt) }}</span></div>
                        }
                      </div>
                    </div>
                    @if (objectKeys(alert.metadata).length > 0) {
                      <div class="col-md-6">
                        <div class="text-muted mb-2" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Metadata</div>
                        <div class="d-flex flex-column gap-1">
                          @for (key of objectKeys(alert.metadata); track key) {
                            <div>
                              <span class="text-muted">{{ key }}:</span>
                              <span class="font-mono ms-2">{{ alert.metadata[key] }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .alert-card { transition: box-shadow .15s; }
    .alert-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,.1); }
    .border-critical { border-left: 3px solid #ef4444 !important; }
    .border-warning { border-left: 3px solid #f59e0b !important; }
    .alert-icon {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .icon-critical { background: rgba(239,68,68,.12); color: #ef4444; }
    .icon-warning { background: rgba(245,158,11,.12); color: #f59e0b; }
    .icon-info { background: rgba(59,130,246,.12); color: #3b82f6; }
  `],
})
export class AlertsComponent {
  private readonly devopsApi = inject(DevopsApiService);
  readonly acknowledging = signal<string | null>(null);
  private readonly expandedSet = signal(new Set<string>());

  searchTerm = '';
  severityFilter = '';
  statusFilter = '';

  readonly alertsQuery = injectQuery(() => ({
    queryKey: ['devops', 'alerts'],
    queryFn: () => this.devopsApi.getAlerts(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  }));

  allAlerts(): Alert[] {
    return this.alertsQuery.data()?.data ?? [];
  }

  filtered(): Alert[] {
    let alerts = this.allAlerts();
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      alerts = alerts.filter((a) =>
        a.message.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
    }
    if (this.severityFilter) alerts = alerts.filter((a) => a.severity === this.severityFilter);
    if (this.statusFilter) alerts = alerts.filter((a) => a.status === this.statusFilter);
    // Sort: open + critical first
    return alerts.sort((a, b) => {
      const statusOrder: Record<AlertStatus, number> = { open: 0, acknowledged: 1, resolved: 2 };
      const sevOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
    });
  }

  countBySeverity(alerts: Alert[], sev: AlertSeverity): number {
    return alerts.filter((a) => a.severity === sev && a.status !== 'resolved').length;
  }

  countByStatus(alerts: Alert[], status: AlertStatus): number {
    return alerts.filter((a) => a.status === status).length;
  }

  acknowledge(id: string): void {
    this.acknowledging.set(id);
    this.devopsApi.acknowledgeAlert(id).then(() => {
      this.acknowledging.set(null);
      void this.alertsQuery.refetch();
    }).catch(() => {
      this.acknowledging.set(null);
    });
  }

  isExpanded(id: string): boolean { return this.expandedSet().has(id); }
  toggleExpanded(id: string): void {
    this.expandedSet.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  iconClass(sev: string): string {
    const map: Record<string, string> = { critical: 'icon-critical', warning: 'icon-warning', info: 'icon-info' };
    return map[sev] ?? 'icon-info';
  }

  severityIcon(sev: string): string {
    const map: Record<string, string> = { critical: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    return map[sev] ?? 'bi-info-circle-fill';
  }

  humanizeType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
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

  objectKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj);
  }
}
