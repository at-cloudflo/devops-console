# DevOps Console — Internal Developer Portal

An enterprise-grade Internal Developer Portal (IDP) POC providing a unified operational dashboard for DevOps and MLOps teams.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [POC Scope](#2-poc-scope)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Choices](#4-technology-choices)
5. [Repository Structure](#5-repository-structure)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [UI/UX Design](#7-uiux-design)
8. [Feature Walkthrough](#8-feature-walkthrough)
9. [Data Flow](#9-data-flow)
10. [Optimization Strategy](#10-optimization-strategy)
11. [Local Development](#11-local-development)
12. [API Overview](#12-api-overview)
13. [Future Roadmap](#13-future-roadmap)
14. [Tradeoffs & Design Decisions](#14-tradeoffs--design-decisions)
15. [Screens Reference](#15-screens-reference)

---

## 1. Project Overview

**What it is:** A web-based Internal Developer Portal that gives DevOps engineers, MLOps engineers, platform engineers, and admins a single pane of glass over:

- Azure DevOps agent pool health and availability
- Self-hosted build agent status
- Pipeline job queue and queue wait times
- Pipeline gate approval tracking
- Vertex AI / MLOps pipeline execution monitoring across multiple GCP projects
- Alert management for infrastructure degradation
- Centralized configuration management

**Who it is for:** Internal engineering teams operating Azure DevOps and GCP/Vertex AI workloads at enterprise scale.

**Why it exists:** At scale (50–100+ Azure DevOps projects, multiple GCP projects), there is no single view across all pools, agents, and ML pipelines. Engineers context-switch across Azure DevOps portals, GCP consoles, and individual project dashboards. This portal normalizes and aggregates all that data in one operational dashboard.

---

## 2. POC Scope

### Implemented

| Feature | Status |
|---|---|
| Login flow with mocked Entra ID users | ✅ |
| Role-based dynamic sidebar menu | ✅ |
| Dashboard with summary cards and pool health | ✅ |
| Agent Pools — grid and table views, health bar, filters | ✅ |
| Agents — status table, capability detail, pool filter | ✅ |
| Job Queue — time-range filter, job table | ✅ |
| Pending Approvals — age tracking, read-only | ✅ |
| Alerts — severity/status filters, acknowledge action | ✅ |
| Vertex AI Jobs — project/region/state filters, inline detail | ✅ |
| Configuration — editable thresholds, intervals, feature flags | ✅ |
| Light / dark theme toggle | ✅ |
| Backend BFF with mock adapters | ✅ |
| In-memory caching with TTL and refresh intervals | ✅ |
| Background polling scheduler | ✅ |
| Alert engine (rule-based) | ✅ |
| Config persistence to JSON file | ✅ |
| Docker Compose for local orchestration | ✅ |

### Mocked / Not Yet Live

| Item | What Replaces It in Production |
|---|---|
| Azure DevOps API calls | `mock-azure-devops.adapter.ts` → swap adapter for live REST calls |
| Vertex AI API calls | `mock-vertex-ai.adapter.ts` → swap adapter for Vertex Pipelines REST API |
| Microsoft Entra ID login | Hardcoded users in `mock-users.json` → MSAL OAuth2 flow |
| Redis cache/session | In-memory `Map` stores → Redis with `ioredis` |
| Database config persistence | JSON file → PostgreSQL or MongoDB |
| Approval actions | Read-only with placeholder buttons |
| Log / artifact links | Static labels (not linked to real GCS/Cloud Logging) |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — Angular SPA                                       │
│  Auth Guard → Role Guard → Lazy-loaded Feature Modules       │
│  TanStack Query (cache + refetch) → ApiClientService         │
└─────────────────────┬────────────────────────────────────────┘
                      │  REST /api/*  (cookie session, CORS)
┌─────────────────────▼────────────────────────────────────────┐
│  Backend — Node.js + Express + TypeScript (BFF)              │
│                                                              │
│  Routes → Controllers → Services → Adapters                  │
│                              ↓                               │
│  CacheService (in-memory snapshots per resource)             │
│  AlertEngine  (rule evaluation on snapshot data)             │
│  RefreshService (setInterval background polling)             │
│  ConfigService (JSON file persistence)                       │
│  AuthService  (mock users + role mapping)                    │
└──────────────────────────────────────────────────────────────┘
         ↓ adapter interfaces (future live integrations)
┌──────────────────────────────────────────────────────────────┐
│  External Systems (mocked in POC)                            │
│  Azure DevOps REST API    Vertex AI REST API                 │
│  Microsoft Entra ID       GCP IAM / Workload Identity        │
└──────────────────────────────────────────────────────────────┘
```

### Architecture & Tech Stack Diagram

```mermaid
flowchart TD
    subgraph browser["🌐  Browser — Angular 17 SPA"]
        direction TB
        ng["Standalone Components · Signals · Lazy Routes\nBootstrap 5 · CSS Custom Properties · Bootstrap Icons"]
        tq["TanStack Query\nstaleTime · gcTime · refetchInterval · deduplication"]
        hc["ApiClientService  ·  HttpClient  ·  withCredentials cookie"]
        ng --> tq --> hc
    end

    subgraph backend["⚙️  Backend — Node.js · Express · TypeScript  (BFF)"]
        direction TB
        auth["AuthService  ·  mock-users.json  →  role-mapping.ts  →  UserProfile"]
        mw["express-session · cors · helmet · morgan"]
        ctrl["Routes  →  Controllers  →  Services"]
        cache["CacheService  ·  in-memory snapshots per resource  ·  TTL"]
        alert["AlertEngine  ·  rule-based evaluation on cached data"]
        sched["RefreshService  ·  setInterval scheduler  ·  per-resource TTL check"]
        auth --> mw --> ctrl --> cache
        sched --> ctrl
    end

    subgraph adapters["🔌  Adapter Layer  — swap mock → live without touching services"]
        direction LR
        az["Azure DevOps Adapter\n─────────────────────────\nPOC  →  mock-*.json\nProd →  ADO REST API + PAT"]
        vx["Vertex AI Adapter\n─────────────────────────\nPOC  →  mock-*.json\nProd →  Vertex Pipelines API"]
    end

    subgraph external["☁️  External Systems  (zero live calls in POC)"]
        direction LR
        ado["Azure DevOps REST API\nMicrosoft Entra ID / MSAL"]
        gcp["Vertex AI Pipelines API\nGCP IAM / Workload Identity"]
    end

    browser  -->|"REST /api/*  ·  httpOnly session cookie  ·  CORS"| backend
    backend  -->|"adapter interface calls"| adapters
    adapters -.->|"future live integration"| external

    style browser   fill:#f5e6ee,stroke:#8e2157,color:#1a1d2e
    style backend   fill:#e8f0fe,stroke:#2563eb,color:#1a1d2e
    style adapters  fill:#e6f7f0,stroke:#059669,color:#1a1d2e
    style external  fill:#fef3c7,stroke:#d97706,color:#1a1d2e
```

### Key Design Decisions

**Backend-for-Frontend (BFF) pattern:** The Angular app never calls Azure DevOps or Vertex AI directly. All external calls are made by the backend, which normalizes the data into portal-friendly DTOs. This is critical for scale: a single backend can aggregate 70+ Azure DevOps projects without the browser making 70+ parallel requests.

**Adapter pattern:** Each external integration (`azure-devops.adapter.ts`, `vertex-ai.adapter.ts`) is a class implementing a standard interface. Swapping mock → live integration means changing only the adapter, not the service or controller.

**Cached snapshots:** The backend stores the last successful fetch of each resource in memory. API endpoints serve from cache by default, so page loads are fast even if the external system is slow or unreachable.

**Role-based menu:** The menu is generated server-side based on the authenticated user's roles. The frontend renders whatever the `/api/menu` endpoint returns — no role logic lives in the frontend templates.

---

## 4. Technology Choices

### Frontend: Angular 17

- **Why Angular:** Enterprise-grade framework with built-in dependency injection, strong typing, lazy loading, and long-term LTS support. Well-suited for internal portals with many views and role-based access.
- **Standalone components:** No NgModules. Every component declares its own imports, keeping code modular and tree-shakeable.
- **Signals:** Angular 17 signals (`signal`, `effect`, `input`, `output`) used throughout — no RxJS complexity in components where it's unnecessary.
- **No NgRx:** Signals + TanStack Query covers all state management needs without the NgRx boilerplate overhead.

### Bootstrap 5 + CSS Custom Properties

- **Why Bootstrap:** Provides a complete responsive grid and utility system without requiring a heavy Angular component library. Fine-grained control over styling with minimal JavaScript dependency.
- **CoreUI-style layout:** Sidebar + topbar shell built from scratch using Bootstrap and custom CSS — no dependency on CoreUI package itself. This avoids version coupling and reduces bundle size.
- **CSS custom properties for theming:** Light/dark mode is implemented via `data-theme` attribute on `<html>` and a set of CSS variables (`--dc-*`). No CSS duplication, no Angular Material theming overhead.

### TanStack Query

- **Why TanStack Query:** Server-state management with stale-while-revalidate caching, automatic background refetch, loading/error states, and request deduplication out of the box. Replaces manual `BehaviorSubject` + `tap` + loading flag patterns.
- **Query keys:** Every query is keyed by resource + filters. Filter changes update the query key automatically, triggering a new fetch without manual subscription management.

### Backend: Node.js + Express + TypeScript

- **Why not NestJS:** NestJS adds significant complexity and startup overhead for a POC. Express with TypeScript provides the same structure with less ceremony. Controllers, services, and adapters are plain TypeScript classes.
- **express-session:** Session-based auth (httpOnly cookie) avoids the frontend needing to manage tokens. Designed to be replaced with MSAL + Entra ID in production.

### Minimal Dependencies

A core goal is keeping the dependency footprint small for a private-proxy deployment environment:

| Package | Purpose |
|---|---|
| express | HTTP server |
| cors, helmet, morgan | Standard middleware |
| express-session | Session management |
| dotenv | Environment config |
| @angular/core + platform | Angular framework |
| @tanstack/angular-query-experimental | Server-state caching |
| bootstrap, bootstrap-icons | UI framework + icons |
| rxjs | Angular peer dependency only |

No charting library, no heavy component library, no state management framework.

---

## 5. Repository Structure

```
devops-console/
├── README.md
├── .gitignore
├── .env.example                  # Root env template
├── docker-compose.yml            # Local orchestration
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts             # Entry point, graceful shutdown
│       ├── app.ts                # Express app, middleware, route registration
│       ├── adapters/
│       │   ├── azure-devops.adapter.ts  # Mock Azure DevOps integration
│       │   └── vertex-ai.adapter.ts     # Mock Vertex AI integration
│       ├── auth/
│       │   ├── auth.service.ts   # User lookup, profile building
│       │   └── role-mapping.ts   # Entra group → portal role mapping
│       ├── cache/
│       │   └── cache.service.ts  # In-memory snapshot store with TTL
│       ├── controllers/          # Request handlers (thin — delegate to services)
│       ├── data/                 # Static mock JSON fixtures
│       │   ├── mock-pools.json
│       │   ├── mock-agents.json
│       │   ├── mock-queue.json
│       │   ├── mock-approvals.json
│       │   ├── mock-vertex-jobs.json
│       │   ├── mock-users.json
│       │   └── default-config.json
│       ├── middleware/
│       │   ├── auth.middleware.ts  # requireAuth guard for protected routes
│       │   └── error.middleware.ts # 404 + error handler
│       ├── models/                 # TypeScript interfaces / DTOs
│       ├── routes/                 # Express route definitions
│       └── services/
│           ├── devops.service.ts   # Pool, agent, queue, approval logic
│           ├── mlops.service.ts    # Vertex job logic
│           ├── alert.service.ts    # Alert store, acknowledge, resolve
│           ├── config.service.ts   # Config load/save to JSON file
│           └── refresh.service.ts  # Background polling scheduler
│
└── frontend/
    ├── angular.json
    ├── package.json
    ├── proxy.conf.json             # Dev proxy: /api → localhost:3000
    ├── tsconfig.json
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.scss             # Global styles, Bootstrap overrides, themes
        ├── environments/
        └── app/
            ├── app.component.ts    # Root component — bootstraps auth
            ├── app.config.ts       # Angular providers + TanStack QueryClient
            ├── app.routes.ts       # Route definitions with lazy loading + guards
            ├── core/
            │   ├── auth/           # AuthService, authGuard, roleGuard
            │   ├── http/           # ApiClientService (typed HTTP wrapper)
            │   ├── menu/           # MenuService (signal-based menu state)
            │   └── theme/          # ThemeService (light/dark toggle)
            ├── layout/
            │   ├── layout.component.ts    # App shell (sidebar + header + outlet)
            │   ├── sidebar/               # Role-based nav menu
            │   └── header/                # Topbar with refresh, theme, user menu
            ├── models/                    # Shared TypeScript interfaces
            ├── shared/components/
            │   ├── stat-card/             # Summary metric card
            │   ├── status-badge/          # Color-coded status pill
            │   ├── page-header/           # Reusable page title + refresh button
            │   └── loading-spinner/       # Centered spinner with optional message
            └── features/
                ├── auth/login/            # Login page
                ├── dashboard/             # Home dashboard
                ├── devops/
                │   ├── pools/             # Agent pool grid/table
                │   ├── agents/            # Agent list with expandable detail
                │   ├── queue/             # Job queue with time-range filter
                │   ├── approvals/         # Pending approvals
                │   └── alerts/            # Alert list with acknowledge
                ├── mlops/
                │   └── vertex-jobs/       # Vertex AI job table + inline detail
                ├── config/                # Config editor
                └── about/                 # Architecture + roadmap
```

---

## 6. Authentication & Authorization

### Current POC Flow

```
User submits login form
    → POST /api/auth/login {username, password}
    → Backend: auth.service.ts looks up mock-users.json
    → Matches credentials → calls role-mapping.ts
    → Returns UserProfile {id, displayName, email, groups, roles}
    → Session stored server-side (express-session, in-memory store)
    → Cookie set: connect.sid (httpOnly)

Subsequent requests
    → Cookie sent automatically
    → auth.middleware.ts validates session presence
    → Attaches req.session.user to request

Frontend
    → AppComponent.ngOnInit() calls GET /api/auth/me
    → Sets authService.currentUser signal
    → Login page calls GET /api/menu → MenuService.menuItems signal updated
    → Role guards protect routes using currentUser().roles
```

### Mock Users

| Username | Password | Roles |
|---|---|---|
| admin | admin123 | portal.admin (all access) |
| devops | devops123 | devops.read, devops.approval.read |
| mlops | mlops123 | mlops.read |
| readonly | readonly123 | devops.read, mlops.read |

### Entra Group → Role Mapping

```typescript
// backend/src/auth/role-mapping.ts
const GROUP_ROLE_MAP = {
  'entra-portal-admin':    'portal.admin',
  'entra-devops-read':     'devops.read',
  'entra-devops-approver': 'devops.approval.read',
  'entra-mlops-read':      'mlops.read',
  'entra-config-admin':    'config.admin',
};
```

### Production Entra ID Migration Path

1. Register an Azure AD App Registration with the appropriate API permissions
2. Configure redirect URI for MSAL popup/redirect flow
3. On login, redirect to Entra ID → receive ID token
4. Backend validates the JWT, extracts `groups` claim
5. Feed groups through existing `resolveRoles()` — **zero frontend changes required**
6. Replace `express-session` in-memory store with Redis-backed store
7. Add PKCE flow and token refresh handling in `auth.service.ts`

The frontend `AuthService` only calls `/api/auth/me` — it does not care how the session was established.

---

## 7. UI/UX Design

### Color System

| Token | Value | Usage |
|---|---|---|
| `--dc-primary` | `#8e2157` | Buttons, active nav, accent color |
| `--dc-primary-dark` | `#6b1842` | Button hover |
| `--dc-primary-subtle` | `#f5e6ee` | Icon backgrounds, badges |
| `--dc-page-bg` | `#f4f6fb` (light) / `#0f1117` (dark) | Page background |
| `--dc-card-bg` | `#ffffff` (light) / `#1a1d2e` (dark) | Card backgrounds |
| `--dc-sidebar-bg` | `#1e2139` | Sidebar (always dark) |

### Theming

- Default: **light mode**
- Dark mode toggled via `ThemeService` which sets `data-theme="dark"` on `<html>`
- All colors are CSS custom properties — no duplication between themes
- Theme preference persisted in `localStorage`

### Reusable Components

| Component | Selector | Purpose |
|---|---|---|
| `StatCardComponent` | `app-stat-card` | Metric card with icon, value, subtext |
| `StatusBadgeComponent` | `app-status-badge` | Color-coded status pill with dot |
| `PageHeaderComponent` | `app-page-header` | Page title, subtitle, optional refresh button |
| `LoadingSpinnerComponent` | `app-loading-spinner` | Centered spinner with message |

### Menu Generation

The sidebar menu is generated from `/api/menu` which builds the menu server-side based on `req.session.user.roles`. Menu items with `requiredRoles` are only included if the user has at least one matching role. The frontend renders the returned menu array with no role logic — the server is the authority.

---

## 8. Feature Walkthrough

### Dashboard

Home page showing 8 summary stat cards (pools, agents, offline agents, critical alerts, queued jobs, pending approvals, Vertex running, Vertex failed), a pool health breakdown bar, a system status widget, and quick-link cards to the main modules.

### Agent Pools (`/devops/pools`)

Grid and table view toggle. Each pool card shows: name, organization, health availability bar (color-coded: green ≥70%, amber 50–70%, red <50%), agent counts (total/online/busy/offline), status badge, and a link to filtered agents view. Filters: name search, health state. Auto-refreshes every 60s via TanStack Query `refetchInterval`.

### Agents (`/devops/agents`)

Table showing all agents across all pools. Columns: name, pool, status badge, enabled flag, OS, version, tags (first 3 shown). Expandable row reveals full capability map and all tags. Filters: name search, status, pool. Rows highlighted in light red for enabled-but-offline agents.

### Job Queue (`/devops/queue`)

Default view: last 6 hours. Date-range selector adjusts `sinceHours` query parameter. Summary stats at top: queued count, running count, average queue time, oldest job. Table: job ID, pipeline name, project, pool, requested by, requested at, queue duration, status, approval required flag.

### Pending Approvals (`/devops/approvals`)

List of pipeline gate approvals waiting for human review. Columns: approval ID, project, pipeline, stage/environment, approvers, waiting since, age (highlighted red if >threshold). Placeholder approve/reject buttons are rendered but disabled with a "Not enabled in POC" tooltip (controlled by `featureFlags.enableApprovalActions`).

### Alerts (`/devops/alerts`)

Active alerts generated by the backend alert engine. Rules:
- Agent offline > N minutes
- Pool availability < critical threshold
- Queue job wait > N minutes
- Pending approval age > N hours

Alerts are sorted by status (open first) then severity (critical first). Each alert has an acknowledge button. Expanded view shows metadata, timestamps, and source ID.

### Vertex AI Jobs (`/mlops/vertex-jobs`)

Table of pipeline job executions across configured GCP projects. Summary row: running, succeeded, failed counts, average duration. Filters: search, project, region, state. Inline detail panel (click info button): job metadata, labels, state history, resource links (placeholder in POC).

### Configuration (`/config`)

Tabular/form editor for:
- Azure DevOps org enable/disable toggles
- GCP project enable/disable toggles
- Alert thresholds (editable number inputs)
- Refresh intervals (with human-readable rendering)
- Feature flags (toggle switches)
- Display settings (theme, page size, timezone)

Changes saved via `PUT /api/config` to the JSON file store. Reset button restores defaults.

---

## 9. Data Flow

```
1. User visits the app
   └── AppComponent.ngOnInit() → GET /api/auth/me
       ├── Session exists → authService.currentUser set, isAuthenticated = true
       └── No session → isAuthenticated = false

2. Auth guard checks isAuthenticated
   ├── true  → render layout shell
   └── false → redirect to /login

3. Login form submission
   └── POST /api/auth/login
       └── Backend authenticates → sets session → returns UserProfile
           └── Frontend: authService.currentUser set
               └── GET /api/menu → menuService.menuItems set
                   └── router.navigate('/dashboard')

4. Dashboard loads
   └── DashboardComponent creates TanStack Query
       queryKey: ['dashboard', 'summary']
       queryFn: GET /api/dashboard/summary
       └── Backend: reads from CacheService snapshot
           └── Returns aggregated DashboardSummary DTO

5. Pools page loads
   └── PoolsComponent creates TanStack Query
       queryKey: ['devops', 'pools']
       queryFn: GET /api/devops/pools
       └── Backend: devopsService.getPools()
           ├── CacheService has fresh data → return cached snapshot
           └── Cache expired → devops adapter fetches from mock JSON → store in cache

6. Background refresh (server-side)
   └── RefreshService.startBackgroundRefresh()
       ├── Every 60s: refresh pools + agents snapshot
       ├── Every 90s: refresh queue + approvals
       ├── Every 120s: refresh vertex jobs
       ├── After each refresh: run AlertEngine rule evaluation
       └── Any alert state changes → update in-memory alert store

7. Manual refresh (frontend)
   └── User clicks Refresh button → POST /api/system/refresh
       └── Backend triggers immediate refresh of all resources
           └── TanStack Query refetch() on component re-fetches updated data
```

---

## 10. Optimization Strategy

### The Scale Problem

At 70 Azure DevOps projects, naively polling all projects from the browser would generate:
- 70× `/pools` requests per page load
- 70× agent requests
- 70× queue requests

Total: **200+ HTTP requests per page load**, each with OAuth overhead.

### Solution Architecture

**1. Backend Aggregation**

The frontend makes exactly 1 request per resource type (e.g., `GET /api/devops/pools`). The backend aggregates across all configured projects before responding. The browser never knows how many upstream projects exist.

**2. Cached Snapshots**

```typescript
// CacheService stores snapshots per resource key
cache.set('pools', normalizedPoolData, ttlMs);
// On API request: return cache if fresh, else fetch + store
```

Snapshot TTLs are configurable per resource. Typical values:
- Pools: 60s
- Agents: 60s
- Queue: 30s
- Vertex jobs: 120s
- Approvals: 60s

**3. Background Refresh (Server-side)**

`RefreshService` runs `setInterval` loops on the backend. Snapshots are pre-warmed before any user requests them. Page load always hits warm cache.

**4. Angular Lazy Loading**

Feature modules are lazy-loaded via `loadComponent()` in route definitions. Only the bundle for the active route is downloaded. Dashboard does not load DevOps or MLOps code.

**5. TanStack Query Caching**

- `staleTime: 30_000` — data served from cache for 30s before background refetch
- `gcTime: 300_000` — cache retained 5 minutes after component unmount
- `refetchInterval: 60_000` — polling while component is mounted
- `refetchOnWindowFocus: false` — no surprise refetches on tab focus

**6. Query Key Design**

Filter changes (project, region, state) update the query key, which triggers a new fetch with the correct parameters. No manual subscription management.

**7. Future: Pagination + Streaming**

For very large datasets, the backend API supports a `pageSize` parameter. In production, the backend would use streaming aggregation with Azure DevOps continuation tokens.

---

## 11. Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### One-command start (recommended)

Install deps once, then use a single command from the repo root:

```bash
# First-time install
npm run install:all

# Copy env files (only needed once)
cp backend/.env.example backend/.env

# Start both backend and frontend in parallel
npm start
# Backend:  http://localhost:3000
# Frontend: http://localhost:4200
```

**Add a shell alias** so you can launch the portal from anywhere:

```bash
# Add to ~/.zshrc or ~/.bashrc
echo "alias devops-console='npm --prefix ~/Documents/projects/devops-console start'" >> ~/.zshrc && source ~/.zshrc

# Then from any directory:
devops-console
```

### Install

```bash
# All at once from repo root
npm run install:all

# Or individually
cd backend  && npm install
cd frontend && npm install
```

### Environment Setup

```bash
cp backend/.env.example backend/.env
# Defaults work for local POC — no edits needed
```

### Run Backend only

```bash
cd backend
npm run dev
# API available at http://localhost:3000
# Health check: curl http://localhost:3000/api/system/health
```

### Run Frontend only

```bash
cd frontend
npm start
# App available at http://localhost:4200
# Proxies /api/* to http://localhost:3000 via proxy.conf.json
```

### Run with Docker Compose

```bash
docker-compose up --build
# Frontend: http://localhost:4200
# Backend:  http://localhost:3000
```

### Demo Accounts

| Username | Password | Access Level |
|---|---|---|
| `admin` | `admin123` | Full access — all modules |
| `devops` | `devops123` | DevOps module only |
| `mlops` | `mlops123` | MLOps module only |
| `readonly` | `readonly123` | DevOps + MLOps, read-only |

### Environment Variables

**Backend (`backend/.env`)**

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-here
ALLOWED_ORIGINS=http://localhost:4200
```

**Frontend (`frontend/src/environments/environment.ts`)**

```typescript
export const environment = {
  production: false,
  apiBase: '/api',
};
```

---

## 12. API Overview

All endpoints are prefixed with `/api/`.

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login with username/password |
| POST | `/auth/logout` | Destroy session |
| GET | `/auth/me` | Get current user profile |

**POST /auth/login request:**
```json
{ "username": "admin", "password": "admin123" }
```
**POST /auth/login response:**
```json
{
  "success": true,
  "user": {
    "id": "usr-001",
    "displayName": "Admin User",
    "email": "admin@internal.example.com",
    "groups": ["entra-portal-admin"],
    "roles": ["portal.admin"],
    "avatarInitials": "AU"
  }
}
```

### Menu

| Method | Path | Description |
|---|---|---|
| GET | `/menu` | Get role-filtered sidebar menu |

### Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/summary` | Aggregated summary stats for home dashboard |

### DevOps

| Method | Path | Description |
|---|---|---|
| GET | `/devops/pools` | All pool summaries |
| GET | `/devops/pools/:id` | Single pool |
| GET | `/devops/pools/:id/agents` | Agents for a specific pool |
| GET | `/devops/agents` | All agents (optional `?poolId=`) |
| GET | `/devops/queue` | Queue jobs (`?sinceHours=6&project=&pool=`) |
| GET | `/devops/approvals` | Pending approvals (`?project=`) |
| GET | `/devops/alerts` | Alerts (`?status=open|acknowledged|resolved`) |
| POST | `/devops/alerts/:id/acknowledge` | Acknowledge an alert |

**GET /devops/pools response:**
```json
{
  "data": [
    {
      "id": "pool-001",
      "name": "Production Linux Agents",
      "organization": "my-org",
      "totalAgents": 10,
      "onlineAgents": 9,
      "offlineAgents": 1,
      "busyAgents": 4,
      "idleAgents": 5,
      "healthPercent": 90,
      "alertState": "healthy",
      "lastRefresh": "2026-03-28T10:00:00.000Z"
    }
  ],
  "total": 4
}
```

### MLOps

| Method | Path | Description |
|---|---|---|
| GET | `/mlops/vertex/jobs` | Vertex AI jobs (`?projectId=&region=&state=&search=`) |
| GET | `/mlops/vertex/jobs/:id` | Job detail with state history |

### Config

| Method | Path | Description |
|---|---|---|
| GET | `/config` | Load system configuration |
| PUT | `/config` | Save configuration changes |
| POST | `/config/reset` | Reset to defaults |

### System

| Method | Path | Description |
|---|---|---|
| GET | `/system/health` | Health check |
| GET | `/system/refresh-status` | Last refresh times per resource |
| POST | `/system/refresh` | Trigger immediate refresh |

---

## 13. Future Roadmap

### High Priority

**Real Microsoft Entra ID SSO**
- Register Azure AD app, configure MSAL popup/redirect
- Backend validates JWT, extracts security groups from `groups` claim
- Map groups through existing `resolveRoles()` — no frontend changes

**Live Azure DevOps Integration**
- Replace `mock-azure-devops.adapter.ts` with a real adapter using Azure DevOps REST API
- Authentication: PAT or Azure AD service principal with OAuth2 client credentials
- The adapter interface does not change; only the implementation changes

**Live Vertex AI Integration**
- Replace `mock-vertex-ai.adapter.ts` with calls to Vertex AI Pipelines REST API
- Authentication: GCP Workload Identity or service account JSON key
- Same adapter interface

### Medium Priority

- **Approval Actions** — Implement approve/reject via Azure DevOps Approvals API (already behind `featureFlags.enableApprovalActions`)
- **Redis Cache + Session Store** — Replace `Map`-based cache and in-memory session with Redis for horizontal scaling
- **Alert Subscriptions** — Push alerts to Slack/Teams/PagerDuty via webhook
- **PostgreSQL Config Store** — Replace JSON file with a database for multi-instance deployments
- **Pagination** — Add cursor/page-based pagination to queue and jobs endpoints for large result sets

### Low Priority

- **Kubernetes Workloads Module** — Cluster/pod/deployment health dashboard
- **Terraform Plans Module** — Show pending/applied Terraform changes
- **Cost Dashboard** — Azure + GCP spend aggregation
- **Audit Log** — Track config changes and approval actions with user attribution
- **Notification Center** — In-portal notification bell for critical alerts

---

## 14. Tradeoffs & Design Decisions

### POC Simplifications

| Decision | POC Choice | Production Alternative |
|---|---|---|
| Session store | express-session in-memory | Redis with `connect-redis` |
| Config persistence | JSON file | PostgreSQL / MongoDB |
| Cache | In-memory `Map` | Redis with pub/sub invalidation |
| Adapter | Static mock JSON | Live REST API with retry/backoff |
| Auth | Hardcoded users | MSAL + Entra ID |
| Background jobs | `setInterval` | Bull queue / Cloud Scheduler |

### Why No NgRx

NgRx adds significant boilerplate (actions, reducers, effects, selectors) that is unnecessary when:
- Server state is owned by TanStack Query
- UI state is local to components (Angular signals handle this cleanly)
- There is no complex client-side state machine

The only shared state is the auth user and menu — both handled with `signal()` in `AuthService` and `MenuService`.

### Why Inline Templates (No Separate HTML Files)

Angular standalone components with inline templates keep each component self-contained in a single file. For a POC where all components are small to medium-sized, this reduces file count and makes code easier to navigate. Larger components (e.g., `config.component.ts`) could benefit from extraction in production.

### Why Bootstrap Over Angular Material

- Bootstrap has zero Angular coupling — it works with any framework version
- Bootstrap 5 removed jQuery dependency
- CSS custom properties make theming straightforward without a complex Material theming pipeline
- Smaller impact on bundle size when tree-shaken with sass imports

### Package Minimization

The project avoids packages that require network access to external CDNs or have complex native build dependencies. This is intentional for deployment behind a corporate proxy. All icons use Bootstrap Icons (bundled CSS font — no external CDN).

---

## 15. Screens Reference

| Route | Screen |
|---|---|
| `/login` | Login form with demo accounts hint |
| `/dashboard` | Summary cards, pool health bar, system status, quick links |
| `/devops/pools` | Pool grid/table with health bars and agent counts |
| `/devops/agents` | Agent table with expandable capability detail |
| `/devops/queue` | Job queue with time-range filter and status badges |
| `/devops/approvals` | Approval table with age and waiting-since |
| `/devops/alerts` | Alert list with severity/status filter and acknowledge action |
| `/mlops/vertex-jobs` | Vertex job table with inline detail panel |
| `/config` | Config editor with form inputs and toggle switches |
| `/about` | Architecture diagram, tech stack, role map, roadmap |

---

*Built as a POC. Replace mocked adapters with live integrations before production deployment.*
