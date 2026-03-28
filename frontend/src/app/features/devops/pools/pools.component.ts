import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DevopsApiService } from '../devops-api.service';
import { PoolSummary } from '../../../models/devops.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-pools',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header
      title="Agent Pools"
      subtitle="Monitor Azure DevOps agent pool health and availability"
      [showRefresh]="true"
      [refreshing]="poolsQuery.isFetching()"
      [lastRefresh]="lastRefresh()"
      (onRefresh)="refresh()"
    ></app-page-header>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="d-flex align-items-center gap-2 flex-wrap" style="flex:1">
        <div class="input-group input-group-sm" style="max-width:220px">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" placeholder="Search pools..." [(ngModel)]="searchTerm" />
        </div>
        <select class="form-select form-select-sm" style="max-width:150px" [(ngModel)]="statusFilter">
          <option value="">All States</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-icon" [class.btn-primary]="viewMode()==='grid'" [class.btn-outline-secondary]="viewMode()!=='grid'" (click)="viewMode.set('grid')" title="Card view">
          <i class="bi bi-grid-3x3-gap-fill"></i>
        </button>
        <button class="btn btn-sm btn-icon" [class.btn-primary]="viewMode()==='table'" [class.btn-outline-secondary]="viewMode()!=='table'" (click)="viewMode.set('table')" title="Table view">
          <i class="bi bi-table"></i>
        </button>
      </div>
    </div>

    @if (poolsQuery.isPending()) {
      <app-loading-spinner></app-loading-spinner>
    } @else if (poolsQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load pools</h5>
        <p>{{ poolsQuery.error()?.message }}</p>
        <button class="btn btn-sm btn-primary mt-2" (click)="refresh()">Retry</button>
      </div>
    } @else {
      @if (filtered().length === 0) {
        <div class="empty-state card card-body">
          <i class="bi bi-collection"></i>
          <h5>No pools found</h5>
          <p>No pools match the current filter criteria.</p>
        </div>
      }

      <!-- Summary row -->
      @if (poolsQuery.data()?.data; as pools) {
        <div class="row g-2 mb-3">
          <div class="col-auto">
            <div class="badge bg-secondary-subtle text-secondary py-2 px-3" style="font-size:12px">
              {{ pools.length }} pools total
            </div>
          </div>
          <div class="col-auto">
            <div class="badge py-2 px-3 badge-severity-warning" style="font-size:12px">
              {{ countByState(pools,'warning') }} warning
            </div>
          </div>
          <div class="col-auto">
            <div class="badge py-2 px-3 badge-severity-critical" style="font-size:12px">
              {{ countByState(pools,'critical') }} critical
            </div>
          </div>
        </div>
      }

      <!-- Grid view -->
      @if (viewMode() === 'grid') {
        <div class="row g-3">
          @for (pool of filtered(); track pool.id) {
            <div class="col-md-6 col-xl-4">
              <div class="card h-100 pool-card" [class.border-danger]="pool.alertState==='critical'" [class.border-warning]="pool.alertState==='warning'">
                <div class="card-body">
                  <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="flex-grow-1 min-w-0 me-2">
                      <div class="fw-600 truncate" style="font-size:14px">{{ pool.name }}</div>
                      <div class="text-muted mt-1" style="font-size:11.5px">
                        <i class="bi bi-building me-1"></i>{{ pool.organization }}
                        @if (pool.project) { · {{ pool.project }} }
                      </div>
                    </div>
                    <app-status-badge [status]="pool.alertState"></app-status-badge>
                  </div>

                  <!-- Health bar -->
                  <div class="mb-3">
                    <div class="d-flex justify-content-between" style="font-size:12px;margin-bottom:4px">
                      <span class="text-muted">Availability</span>
                      <span class="fw-600"
                        [style.color]="pool.healthPercent >= 70 ? '#10b981' : pool.healthPercent >= 50 ? '#f59e0b' : '#ef4444'"
                      >{{ pool.healthPercent | number:'1.0-1' }}%</span>
                    </div>
                    <div class="health-bar">
                      <div class="health-fill"
                        [class.fill-healthy]="pool.alertState==='healthy'"
                        [class.fill-warning]="pool.alertState==='warning'"
                        [class.fill-critical]="pool.alertState==='critical'"
                        [style.width.%]="pool.healthPercent"
                      ></div>
                    </div>
                  </div>

                  <!-- Agent counts -->
                  <div class="row g-2 text-center" style="font-size:12px">
                    <div class="col-3">
                      <div class="fw-600" style="font-size:16px">{{ pool.totalAgents }}</div>
                      <div class="text-muted">Total</div>
                    </div>
                    <div class="col-3">
                      <div class="fw-600" style="font-size:16px;color:#10b981">{{ pool.onlineAgents }}</div>
                      <div class="text-muted">Online</div>
                    </div>
                    <div class="col-3">
                      <div class="fw-600" style="font-size:16px;color:#3b82f6">{{ pool.busyAgents }}</div>
                      <div class="text-muted">Busy</div>
                    </div>
                    <div class="col-3">
                      <div class="fw-600" style="font-size:16px;color:#ef4444">{{ pool.offlineAgents }}</div>
                      <div class="text-muted">Offline</div>
                    </div>
                  </div>
                </div>
                <div class="card-footer d-flex justify-content-between align-items-center" style="background:transparent;border-top:1px solid var(--dc-card-border);padding:10px 16px">
                  <span style="font-size:11px;color:var(--dc-text-muted)">
                    <i class="bi bi-clock me-1"></i>{{ formatTime(pool.lastRefresh) }}
                  </span>
                  <a [routerLink]="['/devops/agents']" [queryParams]="{poolId: pool.id}" class="btn btn-sm btn-outline-secondary" style="font-size:11px">
                    View Agents <i class="bi bi-arrow-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Table view -->
      @if (viewMode() === 'table') {
        <div class="card">
          <div class="dc-table-container">
            <table class="dc-table table table-hover mb-0">
              <thead>
                <tr>
                  <th>Pool Name</th>
                  <th>Organization</th>
                  <th class="text-center">Total</th>
                  <th class="text-center">Online</th>
                  <th class="text-center">Offline</th>
                  <th class="text-center">Busy</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th>Last Refresh</th>
                </tr>
              </thead>
              <tbody>
                @for (pool of filtered(); track pool.id) {
                  <tr>
                    <td class="fw-500">{{ pool.name }}</td>
                    <td class="text-muted">{{ pool.organization }}</td>
                    <td class="text-center">{{ pool.totalAgents }}</td>
                    <td class="text-center" style="color:#10b981">{{ pool.onlineAgents }}</td>
                    <td class="text-center" style="color:#ef4444">{{ pool.offlineAgents }}</td>
                    <td class="text-center" style="color:#3b82f6">{{ pool.busyAgents }}</td>
                    <td style="min-width:120px">
                      <div class="d-flex align-items-center gap-2">
                        <div class="flex-grow-1"><div class="health-bar"><div class="health-fill" [class.fill-healthy]="pool.alertState==='healthy'" [class.fill-warning]="pool.alertState==='warning'" [class.fill-critical]="pool.alertState==='critical'" [style.width.%]="pool.healthPercent"></div></div></div>
                        <span style="font-size:12px;width:38px;text-align:right">{{ pool.healthPercent | number:'1.0-0' }}%</span>
                      </div>
                    </td>
                    <td><app-status-badge [status]="pool.alertState"></app-status-badge></td>
                    <td style="font-size:12px;color:var(--dc-text-muted)">{{ formatTime(pool.lastRefresh) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .pool-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .border-danger { border-left: 3px solid #ef4444 !important; }
    .border-warning { border-left: 3px solid #f59e0b !important; }
  `]
})
export class PoolsComponent {
  private readonly devopsApi = inject(DevopsApiService);
  readonly viewMode = signal<'grid' | 'table'>('grid');
  readonly lastRefresh = signal<string | null>(null);
  searchTerm = '';
  statusFilter = '';

  readonly poolsQuery = injectQuery(() => ({
    queryKey: ['devops', 'pools'],
    queryFn: async () => {
      const result = await this.devopsApi.getPools();
      this.lastRefresh.set(new Date().toLocaleTimeString());
      return result;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  }));

  refresh(): void {
    void this.poolsQuery.refetch();
  }

  filtered(): PoolSummary[] {
    let pools = this.poolsQuery.data()?.data ?? [];
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      pools = pools.filter((p) => p.name.toLowerCase().includes(q) || p.organization.toLowerCase().includes(q));
    }
    if (this.statusFilter) {
      pools = pools.filter((p) => p.alertState === this.statusFilter);
    }
    return pools;
  }

  countByState(pools: PoolSummary[], state: string): number {
    return pools.filter((p) => p.alertState === state).length;
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
