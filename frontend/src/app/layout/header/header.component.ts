import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ApiClientService } from '../../core/http/api-client.service';
import { RefreshIntervalService } from '../../core/refresh/refresh-interval.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <div>
          <div class="page-title">{{ pageTitle() }}</div>
        </div>
      </div>

      <div class="topbar-actions">
        <!-- Last updated time -->
        @if (lastRefreshed()) {
          <div class="last-updated" [class.refreshing]="refreshing()" title="Last data refresh time">
            <i class="bi bi-arrow-clockwise" [class.spin]="refreshing()"></i>
            <span>Updated {{ lastRefreshedLabel() }}</span>
          </div>
        }

        <!-- Refresh interval selector -->
        <select
          class="form-select form-select-sm"
          style="width:auto;font-size:12px;"
          [ngModel]="refreshIntervalSvc.interval()"
          (ngModelChange)="refreshIntervalSvc.set($event)"
          title="Auto-refresh interval"
        >
          @for (opt of refreshIntervalSvc.options; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>

        <!-- Manual refresh -->
        <button class="btn btn-sm btn-icon btn-outline-secondary" (click)="triggerRefresh()" title="Refresh all data">
          <i class="bi bi-arrow-clockwise"></i>
        </button>

        <!-- Theme toggle -->
        <button class="btn btn-sm btn-icon btn-outline-secondary" (click)="themeService.toggleTheme()" title="Toggle theme">
          <i class="bi" [ngClass]="themeService.theme() === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
        </button>

        <!-- User dropdown -->
        <div class="dropdown">
          <button
            class="btn btn-sm d-flex align-items-center gap-2"
            type="button"
            (click)="toggleUserMenu()"
            style="border:none;background:none;padding:4px 8px;"
          >
            <span
              class="rounded-circle d-flex align-items-center justify-content-center text-white fw-600"
              style="width:32px;height:32px;font-size:12px;background:var(--dc-primary);flex-shrink:0"
            >
              {{ user()?.avatarInitials ?? '?' }}
            </span>
            <span class="d-none d-md-inline" style="font-size:13px;font-weight:500;color:var(--dc-text-primary)">
              {{ user()?.displayName }}
            </span>
            <i class="bi bi-chevron-down" style="font-size:10px;color:var(--dc-text-muted)"></i>
          </button>

          @if (showUserMenu()) {
            <div
              class="dropdown-menu dropdown-menu-end show"
              style="min-width:220px;margin-top:4px;"
              (click)="showUserMenu.set(false)"
            >
              <div class="px-3 py-2" style="border-bottom:1px solid var(--dc-border-color)">
                <div style="font-size:13px;font-weight:600;color:var(--dc-text-primary)">{{ user()?.displayName }}</div>
                <div style="font-size:11.5px;color:var(--dc-text-muted)">{{ user()?.email }}</div>
              </div>
              <div class="px-3 py-1">
                <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--dc-text-muted);margin-top:6px;margin-bottom:4px;">Roles</div>
                @for (role of user()?.roles; track role) {
                  <span class="badge bg-secondary me-1 mb-1" style="font-size:10px;font-weight:500">{{ role }}</span>
                }
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item text-danger" (click)="logout()">
                <i class="bi bi-box-arrow-right me-2"></i>Sign Out
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    @if (showUserMenu()) {
      <div class="position-fixed inset-0" style="z-index:40" (click)="showUserMenu.set(false)"></div>
    }
  `
})
export class HeaderComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly refreshIntervalSvc = inject(RefreshIntervalService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiClientService);
  private readonly queryClient = injectQueryClient();

  readonly user = this.authService.currentUser;
  readonly showUserMenu = signal(false);
  readonly pageTitle = signal('Dashboard');
  readonly refreshing = signal(false);
  readonly lastRefreshed = signal<Date | null>(null);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle.set(this.getTitleFromRoute());
        this.showUserMenu.set(false);
      });

    this.queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && (event as any).action?.type === 'success') {
        this.lastRefreshed.set(new Date());
      }
    });
  }

  lastRefreshedLabel(): string {
    const d = this.lastRefreshed();
    if (!d) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  toggleUserMenu(): void {
    this.showUserMenu.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  triggerRefresh(): void {
    this.refreshing.set(true);
    this.api.post('/system/refresh').subscribe({
      complete: () => {
        this.refreshing.set(false);
        void this.queryClient.invalidateQueries();
      },
      error: () => {
        this.refreshing.set(false);
      },
    });
  }

  private getTitleFromRoute(): string {
    const path = this.router.url.split('?')[0];
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/devops/pools': 'Agent Pools',
      '/devops/agents': 'Agents',
      '/devops/queue': 'Job Queue',
      '/devops/approvals': 'Pending Approvals',
      '/devops/alerts': 'Alerts',
      '/mlops/vertex-jobs': 'Vertex AI Jobs',
      '/config': 'Configuration',
      '/about': 'About',
    };
    return map[path] ?? 'DevOps Console';
  }
}
