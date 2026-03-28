import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { RefreshIntervalService } from '../../../core/refresh/refresh-interval.service';
import { AgentDetail } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent, PaginatorComponent, RelativeTimePipe],
  template: `
    <app-page-header
      title="Agents"
      subtitle="Status of all self-hosted agents across pools"
      [showRefresh]="true"
      [refreshing]="agentsQuery.isFetching()"
      (onRefresh)="agentsQuery.refetch()"
    ></app-page-header>

    <div class="filters-bar">
      <div class="input-group input-group-sm" style="max-width:220px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" placeholder="Search agents..." [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()" />
      </div>
      <select class="form-select form-select-sm" style="max-width:160px" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Statuses</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
        <option value="busy">Busy</option>
        <option value="disabled">Disabled</option>
      </select>
      <select class="form-select form-select-sm" style="max-width:220px" [(ngModel)]="poolFilter" (ngModelChange)="onFilterChange()">
        <option value="">All Pools</option>
        @for (pool of uniquePools(); track pool) {
          <option [value]="pool">{{ pool }}</option>
        }
      </select>
      <div class="ms-auto d-flex align-items-center gap-2" style="font-size:12px;color:var(--dc-text-muted)">
        <span>{{ agentsQuery.data()?.total ?? 0 }} agents</span>
        <span style="color:#ef4444">{{ offlineCount() }} offline</span>
      </div>
    </div>

    @if (agentsQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (agentsQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load agents</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="agentsQuery.refetch()">Retry</button>
      </div>
    } @else {
      <div class="card">
        <div class="dc-table-container">
          <table class="dc-table table table-hover mb-0">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Pool</th>
                <th>Status</th>
                <th>Enabled</th>
                <th>OS</th>
                <th>Version</th>
                <th>Tags</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (agent of filtered(); track agent.id) {
                <tr [class.table-danger]="agent.status === 'offline' && agent.enabled"
                    [class.opacity-50]="!agent.enabled">
                  <td>
                    <div class="fw-500">{{ agent.name }}</div>
                    <div class="text-muted" style="font-size:11px">{{ agent.organization }}</div>
                  </td>
                  <td>
                    <span class="text-muted" style="font-size:12.5px">{{ agent.poolName }}</span>
                  </td>
                  <td>
                    <app-status-badge [status]="agent.status"></app-status-badge>
                  </td>
                  <td>
                    <span class="badge" [class.bg-success-subtle]="agent.enabled" [class.bg-secondary-subtle]="!agent.enabled" [class.text-success]="agent.enabled" [class.text-secondary]="!agent.enabled">
                      {{ agent.enabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </td>
                  <td style="font-size:12px">
                    <i class="bi me-1" [ngClass]="agent.osDescription.toLowerCase().includes('windows') ? 'bi-windows' : 'bi-ubuntu'"></i>
                    {{ shortOs(agent.osDescription) }}
                  </td>
                  <td><span class="font-mono text-muted">{{ agent.version }}</span></td>
                  <td>
                    <div class="d-flex flex-wrap gap-1">
                      @for (tag of agent.tags.slice(0, 3); track tag) {
                        <span class="badge bg-secondary-subtle text-secondary" style="font-size:10px">{{ tag }}</span>
                      }
                      @if (agent.tags.length > 3) {
                        <span class="badge bg-secondary-subtle text-muted" style="font-size:10px">+{{ agent.tags.length - 3 }}</span>
                      }
                    </div>
                  </td>
                  <td style="font-size:12px;color:var(--dc-text-muted)">
                    {{ agent.lastSeen | relativeTime }}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-icon btn-outline-secondary" (click)="toggleExpanded(agent.id)" title="Details">
                      <i class="bi" [ngClass]="isExpanded(agent.id) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                    </button>
                  </td>
                </tr>
                @if (isExpanded(agent.id)) {
                  <tr>
                    <td colspan="9" style="background:var(--dc-page-bg);padding:12px 20px">
                      <div class="row g-3">
                        <div class="col-md-6">
                          <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--dc-text-secondary)">CAPABILITIES</div>
                          <div class="d-flex flex-wrap gap-2">
                            @for (cap of objectEntries(agent.capabilities); track cap[0]) {
                              <span class="badge bg-info-subtle text-info" style="font-size:11px">
                                {{ cap[0] }}: {{ cap[1] }}
                              </span>
                            }
                            @if (objectEntries(agent.capabilities).length === 0) {
                              <span class="text-muted" style="font-size:12px">No capabilities listed</span>
                            }
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--dc-text-secondary)">ALL TAGS</div>
                          <div class="d-flex flex-wrap gap-1">
                            @for (tag of agent.tags; track tag) {
                              <span class="badge bg-secondary-subtle text-secondary" style="font-size:11px">{{ tag }}</span>
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
              @if (filtered().length === 0) {
                <tr><td colspan="9"><div class="empty-state"><i class="bi bi-cpu"></i><h5>No agents found</h5><p>Adjust your filters to see agents.</p></div></td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (agentsQuery.data(); as resp) {
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
export class AgentsComponent {
  private readonly devopsApi = inject(DevopsApiService);
  private readonly refreshIntervalSvc = inject(RefreshIntervalService);
  private readonly route = inject(ActivatedRoute);

  searchTerm = '';
  statusFilter = '';
  poolFilter = '';
  readonly page = signal(1);
  readonly pageSize = signal(25);
  private readonly expandedSet = signal(new Set<string>());

  readonly agentsQuery = injectQuery(() => ({
    queryKey: ['devops', 'agents', this.searchTerm, this.statusFilter, this.poolFilter, this.page(), this.pageSize()],
    queryFn: () => this.devopsApi.getAgents({
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      pool: this.poolFilter || undefined,
      poolId: this.route.snapshot.queryParamMap.get('poolId') ?? undefined,
      page: this.page(),
      limit: this.pageSize(),
    }),
    staleTime: 30_000,
    refetchInterval: this.refreshIntervalSvc.interval(),
  }));

  onFilterChange(): void {
    this.page.set(1);
  }

  filtered(): AgentDetail[] {
    return this.agentsQuery.data()?.data ?? [];
  }

  uniquePools(): string[] {
    const agents = this.agentsQuery.data()?.data ?? [];
    return [...new Set(agents.map((a) => a.poolName))].sort();
  }

  offlineCount(): number {
    return this.filtered().filter((a) => a.status === 'offline').length;
  }

  isExpanded(id: string): boolean { return this.expandedSet().has(id); }
  toggleExpanded(id: string): void {
    this.expandedSet.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  objectEntries(obj: Record<string, string>): [string, string][] { return Object.entries(obj); }

  shortOs(os: string): string {
    if (os.includes('Ubuntu')) return 'Ubuntu ' + (os.match(/\d+\.\d+/))?.[0];
    if (os.includes('Windows')) return 'Windows Server';
    return os.split(' ').slice(0, 2).join(' ');
  }

}
