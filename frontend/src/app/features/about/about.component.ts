import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      title="About / Architecture"
      subtitle="DevOps Console POC — design decisions, architecture, and roadmap"
    ></app-page-header>

    <div class="about-page">
      <div class="row g-4">

        <!-- Overview card -->
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-terminal-fill me-2 text-primary-brand"></i>Project Overview</h6>
            </div>
            <div class="card-body" style="font-size:13.5px;line-height:1.7;color:var(--dc-text-secondary)">
              <p>
                <strong style="color:var(--dc-text-primary)">DevOps Console</strong> is an Internal Developer Portal
                providing a unified operational dashboard for DevOps and MLOps teams. It aggregates data from
                Azure DevOps infrastructure and Vertex AI pipelines into a single pane of glass.
              </p>
              <p class="mb-0">
                This is a <strong>Proof of Concept (POC)</strong> build — all external integrations are mocked
                using realistic static data. The architecture is designed so that mocks can be replaced with
                live adapters without changing the frontend or API contracts.
              </p>
            </div>
          </div>
        </div>

        <!-- Architecture diagram -->
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-diagram-3-fill me-2 text-primary-brand"></i>Architecture (BFF Pattern)</h6>
            </div>
            <div class="card-body">
              <div class="arch-diagram">{{ archDiagram }}</div>
              <div class="mt-3 d-flex flex-wrap gap-3" style="font-size:12.5px;color:var(--dc-text-secondary)">
                <span><span class="badge bg-primary-subtle text-primary-brand me-1">Frontend</span> Angular 17, Bootstrap 5, TanStack Query</span>
                <span><span class="badge bg-success-subtle text-success me-1">Backend</span> Node.js + Express + TypeScript</span>
                <span><span class="badge bg-info-subtle text-info me-1">Auth</span> Session-based (mocked Entra ID → real MSAL in production)</span>
                <span><span class="badge bg-warning-subtle text-warning me-1">Cache</span> In-memory snapshot store with configurable TTLs</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modules -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-grid-fill me-2 text-primary-brand"></i>Implemented Modules</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                @for (mod of modules; track mod.name) {
                  <div class="d-flex align-items-start gap-3">
                    <div class="stat-icon rounded" style="width:36px;height:36px;background:var(--dc-primary-subtle);flex-shrink:0">
                      <i class="bi text-primary-brand" [ngClass]="mod.icon" style="font-size:15px"></i>
                    </div>
                    <div>
                      <div class="fw-600" style="font-size:13px;color:var(--dc-text-primary)">{{ mod.name }}</div>
                      <div style="font-size:12px;color:var(--dc-text-muted)">{{ mod.desc }}</div>
                    </div>
                    <a [routerLink]="mod.route" class="btn btn-sm btn-outline-secondary ms-auto" style="font-size:11px;flex-shrink:0">
                      Open
                    </a>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Tech stack -->
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <h6><i class="bi bi-stack me-2 text-primary-brand"></i>Technology Stack</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-2">
                @for (item of techStack; track item.label) {
                  <div class="d-flex align-items-center gap-2" style="font-size:13px">
                    <i class="bi text-primary-brand" [ngClass]="item.icon"></i>
                    <span class="fw-500" style="color:var(--dc-text-primary)">{{ item.label }}</span>
                    <span class="text-muted">—</span>
                    <span class="text-muted">{{ item.desc }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Auth model -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-shield-lock-fill me-2 text-primary-brand"></i>Authentication Model</h6>
            </div>
            <div class="card-body" style="font-size:13px;color:var(--dc-text-secondary)">
              <div class="mb-3 p-3 rounded" style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);font-size:12.5px">
                <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                <strong>POC Mode:</strong> Using hardcoded users from <code>mock-users.json</code>.
                Session managed via express-session + in-memory store.
              </div>
              <p>The auth layer is designed for a one-swap upgrade to <strong>Microsoft Entra ID</strong>:</p>
              <ol style="line-height:2;padding-left:18px">
                <li>Replace <code>POST /auth/login</code> with MSAL redirect flow</li>
                <li>Replace <code>GET /auth/me</code> with MSAL token introspection</li>
                <li>Map Entra security groups to portal roles via <code>role-mapping.ts</code></li>
                <li>Frontend <code>AuthService</code> requires no changes</li>
              </ol>
              <div class="mt-3">
                <div class="fw-600 mb-2" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--dc-text-muted)">Role Map</div>
                @for (role of roleMap; track role.group) {
                  <div class="d-flex align-items-center gap-2 mb-1" style="font-size:12px">
                    <span class="badge bg-secondary-subtle text-secondary">{{ role.group }}</span>
                    <i class="bi bi-arrow-right text-muted"></i>
                    <span class="badge bg-primary-subtle text-primary-brand">{{ role.role }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Roadmap -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-map-fill me-2 text-primary-brand"></i>Future Roadmap</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-2">
                @for (item of roadmap; track item.item) {
                  <div class="d-flex align-items-start gap-3" style="font-size:12.5px">
                    <span class="badge mt-1 flex-shrink-0"
                      [ngClass]="item.priority === 'high' ? 'bg-danger-subtle text-danger' : item.priority === 'medium' ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'"
                      style="font-size:10px;min-width:50px;text-align:center"
                    >{{ item.priority }}</span>
                    <div>
                      <div class="fw-500" style="color:var(--dc-text-primary)">{{ item.item }}</div>
                      <div class="text-muted" style="font-size:12px">{{ item.desc }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- POC disclaimer -->
        <div class="col-12">
          <div class="card" style="border-left:3px solid var(--dc-primary)">
            <div class="card-body" style="font-size:12.5px;color:var(--dc-text-secondary)">
              <strong style="color:var(--dc-primary)">POC Scope:</strong>
              All Azure DevOps and Vertex AI data is <strong>mocked</strong> via static JSON adapters in the backend.
              No live API calls are made. The frontend always talks to the BFF (<code>/api/*</code>),
              never directly to external services. Caching uses an in-memory store; production would use Redis.
              Sessions use an in-memory store; production would use Redis-backed express-session.
              Config is persisted to a local JSON file; production would use a database.
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class AboutComponent {
  readonly archDiagram = `
  ┌─────────────────────────────────────────────────────────────────┐
  │  Browser (Angular SPA)                                          │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
  │  │ Dashboard│  │  DevOps  │  │  MLOps   │  │  Config/About  │ │
  │  └──────────┘  └──────────┘  └──────────┘  └────────────────┘ │
  │              TanStack Query cache + Angular HttpClient          │
  └──────────────────────────┬──────────────────────────────────────┘
                             │  REST /api/*  (cookie session)
  ┌──────────────────────────▼──────────────────────────────────────┐
  │  Backend (Node.js + Express + TypeScript)  — BFF Layer          │
  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐ │
  │  │   Auth   │  │  Services  │  │  Adapters    │  │  Cache   │ │
  │  │ /auth/*  │  │ devops /   │  │  Azure DevOps│  │ Snapshot │ │
  │  │  Roles   │  │  mlops /   │  │  Vertex AI   │  │  Store   │ │
  │  │  Menu    │  │  alerts    │  │  (mock / POC)│  │ (in-mem) │ │
  │  └──────────┘  └────────────┘  └──────────────┘  └──────────┘ │
  │              Background refresh scheduler (setInterval)         │
  └─────────────────────────────────────────────────────────────────┘
                   ↓  future live integrations
  ┌────────────────────────────────────────────────────────────────┐
  │  External Systems (mocked in POC)                              │
  │   Azure DevOps REST API         Vertex AI REST API             │
  │   Entra ID / MSAL               GCP IAM                        │
  └────────────────────────────────────────────────────────────────┘`;

  readonly modules = [
    { name: 'Dashboard', icon: 'bi-speedometer2', desc: 'Operational summary with stat cards, pool health, and quick links', route: '/dashboard' },
    { name: 'Agent Pools', icon: 'bi-collection-fill', desc: 'Pool availability, health bar, card and table views', route: '/devops/pools' },
    { name: 'Agents', icon: 'bi-cpu-fill', desc: 'Individual agent status, capabilities, tags, expandable detail', route: '/devops/agents' },
    { name: 'Job Queue', icon: 'bi-list-task', desc: 'Queued and running jobs with time-range filter', route: '/devops/queue' },
    { name: 'Approvals', icon: 'bi-check2-square', desc: 'Pending pipeline gate approvals with age tracking', route: '/devops/approvals' },
    { name: 'Alerts', icon: 'bi-bell-fill', desc: 'Active alerts with acknowledge action and severity filters', route: '/devops/alerts' },
    { name: 'Vertex AI Jobs', icon: 'bi-activity', desc: 'ML pipeline execution tracking across GCP projects', route: '/mlops/vertex-jobs' },
    { name: 'Configuration', icon: 'bi-gear-fill', desc: 'System settings, thresholds, refresh intervals, feature flags', route: '/config' },
  ];

  readonly techStack = [
    { icon: 'bi-code-slash', label: 'Angular 17', desc: 'Standalone components, signals, control flow, lazy loading' },
    { icon: 'bi-bootstrap-fill', label: 'Bootstrap 5', desc: 'Responsive grid, utility classes, dark mode via CSS vars' },
    { icon: 'bi-database-fill', label: 'TanStack Query', desc: 'Server-state caching, stale-while-revalidate, refetch intervals' },
    { icon: 'bi-server', label: 'Node.js + Express', desc: 'Lightweight BFF, REST API, session management' },
    { icon: 'bi-filetype-tsx', label: 'TypeScript', desc: 'Strict types across frontend and backend, shared model shape' },
    { icon: 'bi-hdd-fill', label: 'JSON file store', desc: 'Config persistence for POC; swap to PostgreSQL/Redis in prod' },
  ];

  readonly roleMap = [
    { group: 'entra-portal-admin', role: 'portal.admin' },
    { group: 'entra-devops-read', role: 'devops.read' },
    { group: 'entra-devops-approver', role: 'devops.approval.read' },
    { group: 'entra-mlops-read', role: 'mlops.read' },
    { group: 'entra-config-admin', role: 'config.admin' },
  ];

  readonly roadmap = [
    { priority: 'high', item: 'Real Microsoft Entra ID SSO', desc: 'Replace mock auth with MSAL + Azure AD App Registration' },
    { priority: 'high', item: 'Live Azure DevOps Integration', desc: 'Connect adapter to Azure DevOps REST API with PAT or service principal' },
    { priority: 'high', item: 'Live Vertex AI Integration', desc: 'Connect adapter to Vertex AI REST API using Workload Identity / service account' },
    { priority: 'medium', item: 'Approval Actions', desc: 'Implement approve/reject pipeline gates via Azure DevOps API (behind feature flag)' },
    { priority: 'medium', item: 'Redis Cache + Session Store', desc: 'Replace in-memory store with Redis for horizontal scaling' },
    { priority: 'medium', item: 'Alert Subscriptions / Webhooks', desc: 'Push alerts to Slack, Teams, or email via configurable webhook' },
    { priority: 'medium', item: 'PostgreSQL Config Store', desc: 'Replace JSON file persistence with a proper database' },
    { priority: 'low', item: 'More Platform Modules', desc: 'Kubernetes workloads, Terraform plans, cost dashboards' },
    { priority: 'low', item: 'Audit Log', desc: 'Track config changes and approval actions with user attribution' },
  ];
}
