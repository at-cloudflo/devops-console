# DevOps Console — Frontend

Angular SPA providing the operational dashboard UI. Communicates with the backend BFF exclusively through `/api/*` — no direct calls to Azure DevOps or GCP.

---

## Stack

| Package | Purpose |
|---|---|
| Angular 21 | Framework — standalone components, signals, lazy routes |
| TanStack Query | Server-state cache, background refetch, loading/error states |
| Bootstrap 5 | Responsive layout, utilities |
| Bootstrap Icons | Icon font (bundled, no CDN) |
| RxJS | Angular peer dependency; used in services for HTTP streams |

---

## Structure

```
src/
├── index.html
├── main.ts                         # bootstrapApplication entry point
├── styles.scss                     # Global styles, Bootstrap imports, CSS custom properties
├── environments/
│   ├── environment.ts              # { production: false, apiBase: '/api' }
│   └── environment.prod.ts         # { production: true,  apiBase: '/api' }
└── app/
    ├── app.component.ts            # Root — bootstraps auth on init
    ├── app.config.ts               # provideRouter, provideHttpClient, QueryClient
    ├── app.routes.ts               # Lazy routes with authGuard + roleGuard
    ├── core/
    │   ├── auth/
    │   │   ├── auth.service.ts     # currentUser signal, login/logout, /auth/me
    │   │   ├── auth.guard.ts       # Redirects unauthenticated users to /login
    │   │   └── role.guard.ts       # Blocks routes by required role
    │   ├── http/
    │   │   └── api-client.service.ts  # Typed get/post/put/delete with withCredentials
    │   ├── menu/
    │   │   └── menu.service.ts     # Loads /api/menu, exposes menuItems signal
    │   └── theme/
    │       └── theme.service.ts    # Light/dark toggle, persists to localStorage
    ├── layout/
    │   ├── layout.component.ts     # App shell — sidebar + header + router-outlet
    │   ├── sidebar/                # Role-based nav, renders menu signal
    │   └── header/                 # Topbar — refresh trigger, theme toggle, user menu
    ├── models/                     # Shared TypeScript interfaces
    ├── shared/components/
    │   ├── stat-card/              # Metric card (icon, value, subtext)
    │   ├── status-badge/           # Color-coded status pill
    │   ├── page-header/            # Page title + optional refresh button
    │   └── loading-spinner/        # Centered spinner
    └── features/
        ├── auth/login/             # Login page
        ├── dashboard/              # Home — summary cards, pool health bar
        ├── devops/
        │   ├── pools/              # Pool grid/table with health bars
        │   ├── agents/             # Agent table with expandable capability detail
        │   ├── queue/              # Job queue with time-range filter
        │   ├── approvals/          # Pending approvals (read-only in POC)
        │   └── alerts/             # Alert list with acknowledge action
        ├── mlops/
        │   └── vertex-jobs/        # Vertex job table with inline detail panel
        ├── config/                 # Config editor — thresholds, intervals, flags
        └── about/                  # Architecture diagram, tech stack reference
```

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- Backend running on `http://localhost:3000` (see `../backend/README.md`)

### Setup

```bash
npm install
```

### Run

```bash
npm start
# App available at http://localhost:4200
# /api/* proxied to http://localhost:3000 via proxy.conf.json
```

The proxy config (`proxy.conf.json`) handles `/api` requests during development so the Angular dev server forwards them to the backend — no CORS issues locally.

### Build

```bash
# Development build
npm run build

# Production build (output to dist/)
npm run build:prod
```

### Lint

```bash
npm run lint
```

---

## Theming

Light/dark mode is implemented with CSS custom properties on the `<html>` element:

```scss
// Switched by ThemeService: document.documentElement.setAttribute('data-theme', 'dark')
:root             { --dc-page-bg: #f4f6fb; --dc-card-bg: #ffffff; ... }
[data-theme=dark] { --dc-page-bg: #0f1117; --dc-card-bg: #1a1d2e; ... }
```

No Angular Material theming pipeline, no duplicate style blocks.

---

## Key Design Patterns

**TanStack Query for all server state**

```typescript
// Every data-fetching component follows this pattern
readonly pools = injectQuery(() => ({
  queryKey: ['devops', 'pools'],
  queryFn: () => firstValueFrom(this.api.get<PoolsResponse>('/devops/pools')),
  staleTime: 30_000,
  refetchInterval: 60_000,
}));
```

No manual loading flags, no `BehaviorSubject` chains, no manual error handling per component.

**Signals for UI state**

Local UI state (selected filters, expanded rows, active tab) uses `signal()` directly in the component — no NgRx, no service injection for ephemeral state.

**Role-based routing**

Routes declare `data: { roles: ['devops.read'] }`. The `roleGuard` reads `authService.currentUser().roles` and redirects if the user lacks the required role. The sidebar menu is server-generated and already filtered — the guard is a defence-in-depth layer only.

---

## Production Build Notes

- `environment.prod.ts` sets `apiBase: '/api'` — a relative path
- In production the Angular static files are served by nginx, which proxies `/api/*` to the backend Cloud Run service
- The backend URL is injected into nginx at container startup via `BACKEND_URL` environment variable
- No code changes are needed between dev and prod — only the nginx proxy config differs
