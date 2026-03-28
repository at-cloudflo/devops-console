import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { ConfigApiService } from './config-api.service';
import { SystemConfig, AlertThresholds, RefreshIntervals, TeamsNotificationsConfig } from '../../models/config.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header
      title="Configuration"
      subtitle="System settings, integration targets, and alert thresholds"
    ></app-page-header>

    @if (configQuery.isPending()) {
      <app-loading-spinner message="Loading configuration..."></app-loading-spinner>
    } @else if (configQuery.isError()) {
      <div class="error-state card card-body">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <h5>Failed to load configuration</h5>
        <button class="btn btn-sm btn-primary mt-2" (click)="configQuery.refetch()">Retry</button>
      </div>
    } @else if (draft(); as cfg) {

      <!-- Save/reset bar -->
      <div class="d-flex align-items-center justify-content-between mb-4 p-3 rounded"
        style="background:var(--dc-primary-subtle);border:1px solid rgba(142,33,87,.15)">
        <div style="font-size:13px">
          <i class="bi bi-pencil-fill me-2 text-primary-brand"></i>
          <strong>Edit mode</strong>
          <span class="text-muted ms-2">Changes are saved to the backend JSON store.</span>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" (click)="resetToDefault()" [disabled]="saving()">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Reset to Defaults
          </button>
          <button class="btn btn-sm btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            } @else {
              <i class="bi bi-floppy me-1"></i>
            }
            Save Changes
          </button>
        </div>
      </div>

      @if (savedMessage()) {
        <div class="alert alert-success py-2 mb-3 d-flex align-items-center gap-2" style="font-size:13px">
          <i class="bi bi-check-circle-fill"></i>{{ savedMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger py-2 mb-3 d-flex align-items-center gap-2" style="font-size:13px">
          <i class="bi bi-exclamation-triangle-fill"></i>{{ errorMessage() }}
        </div>
      }

      <div class="row g-4">

        <!-- Azure DevOps Orgs -->
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-microsoft me-2 text-primary-brand"></i>Azure DevOps Organizations</h6>
            </div>
            <div class="card-body p-0">
              <table class="dc-table table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>URL</th>
                    <th>Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  @for (org of cfg.azureDevOpsOrgs; track org.id) {
                    <tr>
                      <td class="fw-500">{{ org.name }}</td>
                      <td class="font-mono text-muted" style="font-size:12px">{{ org.url }}</td>
                      <td>
                        <div class="form-check form-switch mb-0">
                          <input class="form-check-input" type="checkbox" [(ngModel)]="org.enabled" [id]="'org-' + org.id" />
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- GCP Projects -->
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-cloud-fill me-2 text-primary-brand"></i>GCP Projects</h6>
            </div>
            <div class="card-body p-0">
              <table class="dc-table table mb-0">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Project ID</th>
                    <th>Regions</th>
                    <th>Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  @for (proj of cfg.gcpProjects; track proj.id) {
                    <tr>
                      <td class="fw-500">{{ proj.displayName }}</td>
                      <td class="font-mono text-muted" style="font-size:12px">{{ proj.projectId }}</td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          @for (r of proj.regions; track r) {
                            <span class="badge bg-info-subtle text-info" style="font-size:10.5px">{{ r }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div class="form-check form-switch mb-0">
                          <input class="form-check-input" type="checkbox" [(ngModel)]="proj.enabled" [id]="'gcp-' + proj.id" />
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Alert Thresholds -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-bell-fill me-2 text-primary-brand"></i>Alert Thresholds</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                <div>
                  <label class="form-label config-label">Pool Critical Availability (%)</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.alertThresholds.poolCriticalPercent" min="0" max="100" />
                  <div class="form-text">Alert fires when pool availability drops below this percentage.</div>
                </div>
                <div>
                  <label class="form-label config-label">Pool Warning Availability (%)</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.alertThresholds.poolWarningPercent" min="0" max="100" />
                </div>
                <div>
                  <label class="form-label config-label">Agent Offline (minutes)</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.alertThresholds.agentOfflineMinutes" min="1" />
                  <div class="form-text">Alert fires when an agent is offline for this many minutes.</div>
                </div>
                <div>
                  <label class="form-label config-label">Queue Wait (minutes)</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.alertThresholds.queueWaitMinutes" min="1" />
                </div>
                <div>
                  <label class="form-label config-label">Approval Age (hours)</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.alertThresholds.approvalAgeHours" min="1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Refresh Intervals -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-arrow-repeat me-2 text-primary-brand"></i>Refresh Intervals</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                @for (entry of refreshEntries(cfg.refreshIntervals); track entry[0]) {
                  <div>
                    <label class="form-label config-label">{{ humanizeKey(entry[0]) }} (ms)</label>
                    <input type="number" class="form-control form-control-sm" [(ngModel)]="cfg.refreshIntervals[asRefreshKey(entry[0])]" min="5000" step="5000" />
                    <div class="form-text">= {{ msToReadable(cfg.refreshIntervals[asRefreshKey(entry[0])]) }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Feature Flags -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-toggles me-2 text-primary-brand"></i>Feature Flags</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="config-label">Approval Actions</div>
                    <div class="form-text">Enable approve/reject buttons on approvals page.</div>
                  </div>
                  <div class="form-check form-switch mb-0 ms-3">
                    <input class="form-check-input" type="checkbox" [(ngModel)]="cfg.featureFlags.enableApprovalActions" id="ff-approval" />
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="config-label">Alert Notifications</div>
                    <div class="form-text">Enable browser/email alert notifications (future).</div>
                  </div>
                  <div class="form-check form-switch mb-0 ms-3">
                    <input class="form-check-input" type="checkbox" [(ngModel)]="cfg.featureFlags.enableAlertNotifications" id="ff-notifications" />
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="config-label">Config Editing</div>
                    <div class="form-text">Allow users with config.admin role to edit settings.</div>
                  </div>
                  <div class="form-check form-switch mb-0 ms-3">
                    <input class="form-check-input" type="checkbox" [(ngModel)]="cfg.featureFlags.enableConfigEdit" id="ff-config" />
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="config-label">Vertex Log Links</div>
                    <div class="form-text">Enable log URI links on Vertex job details.</div>
                  </div>
                  <div class="form-check form-switch mb-0 ms-3">
                    <input class="form-check-input" type="checkbox" [(ngModel)]="cfg.featureFlags.enableVertexLogs" id="ff-logs" />
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="config-label">Dark Mode</div>
                    <div class="form-text">Allow users to toggle dark mode via theme switcher.</div>
                  </div>
                  <div class="form-check form-switch mb-0 ms-3">
                    <input class="form-check-input" type="checkbox" [(ngModel)]="cfg.featureFlags.enableDarkMode" id="ff-dark" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Display Config -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-display me-2 text-primary-brand"></i>Display Settings</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                <div>
                  <label class="form-label config-label">Default Theme</label>
                  <select class="form-select form-select-sm" [(ngModel)]="cfg.displayConfig.defaultTheme">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label class="form-label config-label">Default Page Size</label>
                  <select class="form-select form-select-sm" [(ngModel)]="cfg.displayConfig.pageSize">
                    <option [ngValue]="20">20 rows</option>
                    <option [ngValue]="50">50 rows</option>
                    <option [ngValue]="100">100 rows</option>
                  </select>
                </div>
                <div>
                  <label class="form-label config-label">Timezone</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="cfg.displayConfig.timeZone" placeholder="e.g. UTC, America/New_York" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Teams Notifications -->
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex align-items-center justify-content-between">
              <h6 class="mb-0"><i class="bi bi-chat-square-text-fill me-2 text-primary-brand"></i>Teams Notifications</h6>
              <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" id="teams-enabled"
                  [(ngModel)]="cfg.teamsNotifications.enabled" />
                <label class="form-check-label" for="teams-enabled" style="font-size:12px">
                  {{ cfg.teamsNotifications.enabled ? 'Enabled' : 'Disabled' }}
                </label>
              </div>
            </div>
            <div class="card-body">
              <div class="row g-3">

                <!-- Webhook URL -->
                <div class="col-12">
                  <label class="form-label config-label">Incoming Webhook URL</label>
                  <input
                    type="url"
                    class="form-control form-control-sm font-mono"
                    [(ngModel)]="cfg.teamsNotifications.webhookUrl"
                    placeholder="https://contoso.webhook.office.com/webhookb2/..."
                    [class.is-invalid]="cfg.teamsNotifications.enabled && !cfg.teamsNotifications.webhookUrl"
                  />
                  @if (cfg.teamsNotifications.enabled && !cfg.teamsNotifications.webhookUrl) {
                    <div class="invalid-feedback">Webhook URL is required when notifications are enabled.</div>
                  } @else {
                    <div class="form-text">
                      Teams channel → <strong>Manage channel</strong> → <strong>Connectors</strong> → <strong>Incoming Webhook</strong> → Create → copy URL here.
                    </div>
                  }
                </div>

                <!-- Min severity + toggles -->
                <div class="col-md-4">
                  <label class="form-label config-label">Minimum Severity</label>
                  <select class="form-select form-select-sm" [(ngModel)]="cfg.teamsNotifications.minSeverity">
                    <option value="info">Info and above</option>
                    <option value="warning">Warning and above</option>
                    <option value="critical">Critical only</option>
                  </select>
                  <div class="form-text">Only alerts at this level or higher will be sent.</div>
                </div>

                <div class="col-md-8">
                  <label class="form-label config-label">Notification Events</label>
                  <div class="d-flex flex-column gap-2 mt-1">
                    <div class="d-flex align-items-center gap-2">
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="teams-new"
                          [(ngModel)]="cfg.teamsNotifications.notifyOnNew" />
                      </div>
                      <div>
                        <label class="mb-0" for="teams-new" style="font-size:13px;font-weight:500;cursor:pointer">New alert</label>
                        <div class="form-text">Send when an alert fires for the first time.</div>
                      </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="teams-escalation"
                          [(ngModel)]="cfg.teamsNotifications.notifyOnEscalation" />
                      </div>
                      <div>
                        <label class="mb-0" for="teams-escalation" style="font-size:13px;font-weight:500;cursor:pointer">Escalation</label>
                        <div class="form-text">Send when an alert escalates from warning to critical.</div>
                      </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="teams-resolved"
                          [(ngModel)]="cfg.teamsNotifications.notifyOnResolution" />
                      </div>
                      <div>
                        <label class="mb-0" for="teams-resolved" style="font-size:13px;font-weight:500;cursor:pointer">Resolved</label>
                        <div class="form-text">Send when an alert clears (off by default).</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Test button -->
                <div class="col-12 pt-1" style="border-top:1px solid var(--dc-border-color)">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    [disabled]="!cfg.teamsNotifications.webhookUrl || testingWebhook()"
                    (click)="testWebhook(cfg.teamsNotifications.webhookUrl)"
                    title="Send a test message to the configured webhook"
                  >
                    @if (testingWebhook()) {
                      <span class="spinner-border spinner-border-sm me-1"></span>Sending...
                    } @else {
                      <i class="bi bi-send me-1"></i>Send Test Message
                    }
                  </button>
                  @if (testResult()) {
                    <span class="ms-3" style="font-size:12px" [class.text-success]="testResult() === 'ok'" [class.text-danger]="testResult() !== 'ok'">
                      {{ testResult() === 'ok' ? '✓ Message delivered' : '✗ ' + testResult() }}
                    </span>
                  }
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Meta -->
        <div class="col-12">
          <div class="text-muted" style="font-size:11.5px">
            <i class="bi bi-clock me-1"></i>
            Last updated: {{ cfg.updatedAt ? formatDate(cfg.updatedAt) : '—' }}
            @if (cfg.updatedBy) { &nbsp;by <strong>{{ cfg.updatedBy }}</strong> }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .config-label { font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--dc-text-primary); }
  `],
})
export class ConfigComponent {
  private readonly configApi = inject(ConfigApiService);
  readonly draft = signal<SystemConfig | null>(null);
  readonly saving = signal(false);
  readonly savedMessage = signal('');
  readonly errorMessage = signal('');
  readonly testingWebhook = signal(false);
  readonly testResult = signal('');

  readonly configQuery = injectQuery(() => ({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await this.configApi.getConfig();
      this.draft.set(structuredClone(res.data));
      return res;
    },
    staleTime: 60_000,
  }));

  save(): void {
    const cfg = this.draft();
    if (!cfg) return;
    this.saving.set(true);
    this.savedMessage.set('');
    this.errorMessage.set('');
    this.configApi.updateConfig(cfg).then((res) => {
      this.saving.set(false);
      this.draft.set(structuredClone(res.data));
      this.savedMessage.set('Configuration saved successfully.');
      setTimeout(() => this.savedMessage.set(''), 4000);
    }).catch((err) => {
      this.saving.set(false);
      this.errorMessage.set(err?.message ?? 'Failed to save configuration.');
    });
  }

  resetToDefault(): void {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    this.saving.set(true);
    this.configApi.resetConfig().then((res) => {
      this.saving.set(false);
      this.draft.set(structuredClone(res.data));
      this.savedMessage.set('Configuration reset to defaults.');
      setTimeout(() => this.savedMessage.set(''), 4000);
    }).catch(() => {
      this.saving.set(false);
    });
  }

  refreshEntries(intervals: RefreshIntervals): [string, number][] {
    return Object.entries(intervals) as [string, number][];
  }

  asRefreshKey(key: string): keyof RefreshIntervals {
    return key as keyof RefreshIntervals;
  }

  humanizeKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace('Ms', '');
  }

  msToReadable(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}m`;
  }

  testWebhook(webhookUrl: string): void {
    if (!webhookUrl) return;
    this.testingWebhook.set(true);
    this.testResult.set('');
    this.configApi.testTeamsWebhook(webhookUrl).then(() => {
      this.testingWebhook.set(false);
      this.testResult.set('ok');
      setTimeout(() => this.testResult.set(''), 5000);
    }).catch((err: Error) => {
      this.testingWebhook.set(false);
      this.testResult.set(err?.message ?? 'Failed to deliver message');
      setTimeout(() => this.testResult.set(''), 8000);
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
