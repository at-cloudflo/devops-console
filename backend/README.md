# DevOps Console — Backend

Node.js + Express + TypeScript BFF (Backend-for-Frontend) that aggregates DevOps and MLOps data and serves it to the Angular frontend.

---

## Responsibilities

- Session-based authentication (mock users → Entra ID in production)
- Role resolution from Entra security groups
- Data aggregation via swappable adapter layer (mock JSON → live APIs in production)
- In-memory snapshot cache with per-resource TTL
- Background polling scheduler
- Rule-based alert engine
- Config persistence (JSON file → Firestore/GCS in production)

---

## Structure

```
src/
├── server.ts               # Entry point — binds port, starts background refresh, graceful shutdown
├── app.ts                  # Express app — middleware stack, route registration
├── adapters/
│   ├── azure-devops.adapter.ts   # Mock Azure DevOps integration (swap for live REST calls)
│   └── vertex-ai.adapter.ts      # Mock Vertex AI integration (swap for Vertex Pipelines API)
├── auth/
│   ├── auth.service.ts     # User lookup and UserProfile construction
│   └── role-mapping.ts     # Entra group → portal role mapping
├── cache/
│   └── cache.service.ts    # In-memory snapshot store with TTL helpers
├── controllers/            # Thin request handlers — delegate to services
├── data/                   # Static mock JSON fixtures
│   ├── mock-pools.json
│   ├── mock-agents.json
│   ├── mock-queue.json
│   ├── mock-approvals.json
│   ├── mock-vertex-jobs.json
│   ├── mock-users.json
│   └── default-config.json
├── middleware/
│   ├── auth.middleware.ts  # requireAuth and requireRole guards
│   └── error.middleware.ts # 404 + global error handler
├── models/                 # TypeScript interfaces and DTOs
├── routes/                 # Express router definitions
└── services/
    ├── devops.service.ts   # Pool, agent, queue, approval business logic
    ├── mlops.service.ts    # Vertex job business logic
    ├── alert.service.ts    # Alert store, acknowledgement, rule evaluation
    ├── config.service.ts   # Config load/save (reads/writes src/data/config.runtime.json)
    └── refresh.service.ts  # Background polling scheduler (setInterval, per-resource TTL)
```

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
cp .env.example .env
```

### Run (development)

```bash
npm run dev
# API available at http://localhost:3000
# Watches src/ and restarts on changes via ts-node-dev
```

### Build (production)

```bash
npm run build
# Compiles TypeScript to dist/
npm start
# Runs dist/server.js
```

### Health check

```bash
curl http://localhost:3000/api/system/health
```

---

## Environment Variables

Copy `.env.example` to `.env`. All variables have sensible defaults for local POC use.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | `production` enables secure cookies and combined logging |
| `SESSION_SECRET` | _(see .env.example)_ | express-session signing secret — change in production |
| `ALLOWED_ORIGINS` | `http://localhost:4200` | Comma-separated CORS origins |
| `REDIS_HOST` | — | Cloud Memorystore host (production only) |
| `REDIS_PORT` | `6379` | Redis port (production only) |
| `POOLS_REFRESH_MS` | `60000` | Pool snapshot TTL |
| `AGENTS_REFRESH_MS` | `60000` | Agent snapshot TTL |
| `QUEUE_REFRESH_MS` | `30000` | Queue snapshot TTL |
| `APPROVALS_REFRESH_MS` | `30000` | Approvals snapshot TTL |
| `VERTEX_JOBS_REFRESH_MS` | `60000` | Vertex job snapshot TTL |
| `POOL_CRITICAL_THRESHOLD` | `50` | Pool availability % below which a critical alert fires |
| `POOL_WARNING_THRESHOLD` | `70` | Pool availability % below which a warning alert fires |
| `AGENT_OFFLINE_ALERT_MINUTES` | `30` | Minutes offline before an agent alert fires |
| `QUEUE_WAIT_ALERT_MINUTES` | `60` | Queue wait time before an alert fires |
| `APPROVAL_AGE_ALERT_HOURS` | `24` | Approval age before an alert fires |
| `AZURE_DEVOPS_ORG_URL` | — | Azure DevOps org URL (leave empty for POC) |
| `AZURE_DEVOPS_PAT` | — | Azure DevOps PAT (leave empty for POC) |
| `GCP_PROJECT_ID` | — | GCP project ID (leave empty for POC) |
| `GCP_REGION` | — | GCP region (leave empty for POC) |
| `ENTRA_TENANT_ID` | — | Entra ID tenant (leave empty for POC) |
| `ENTRA_CLIENT_ID` | — | Entra ID client ID (leave empty for POC) |
| `ENTRA_CLIENT_SECRET` | — | Entra ID client secret (leave empty for POC) |

---

## API Endpoints

All routes prefixed with `/api/`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login with username + password |
| POST | `/auth/logout` | Session | Destroy session |
| GET | `/auth/me` | Session | Current user profile |
| GET | `/menu` | Session | Role-filtered sidebar menu |
| GET | `/dashboard/summary` | Session | Aggregated summary stats |
| GET | `/devops/pools` | Session | All pool summaries |
| GET | `/devops/pools/:id` | Session | Single pool |
| GET | `/devops/pools/:id/agents` | Session | Agents for a pool |
| GET | `/devops/agents` | Session | All agents (`?poolId=`) |
| GET | `/devops/queue` | Session | Job queue (`?sinceHours=&project=&pool=`) |
| GET | `/devops/approvals` | Session | Pending approvals (`?project=`) |
| GET | `/devops/alerts` | Session | Alerts (`?status=open\|acknowledged\|resolved`) |
| POST | `/devops/alerts/:id/acknowledge` | Session | Acknowledge an alert |
| GET | `/mlops/vertex/jobs` | Session | Vertex jobs (`?projectId=&region=&state=&search=`) |
| GET | `/mlops/vertex/jobs/:id` | Session | Job detail with state history |
| GET | `/config` | Session | Load system configuration |
| PUT | `/config` | Session + config.admin | Save configuration |
| POST | `/config/reset` | Session + config.admin | Reset to defaults |
| GET | `/system/health` | Public | Health check |
| GET | `/system/refresh-status` | Session | Last refresh time per resource |
| POST | `/system/refresh` | Session | Trigger immediate refresh |

---

## Mock Users

| Username | Password | Roles |
|---|---|---|
| `admin` | `admin123` | `portal.admin` |
| `devops` | `devops123` | `devops.read`, `devops.approval.read` |
| `mlops` | `mlops123` | `mlops.read` |
| `readonly` | `readonly123` | `devops.read`, `mlops.read` |

---

## Production Migration Notes

| POC component | Production replacement |
|---|---|
| `mock-users.json` | Entra ID — MSAL OAuth2, JWT group claim → `resolveRoles()` |
| `azure-devops.adapter.ts` | Azure DevOps REST API with PAT or service principal |
| `vertex-ai.adapter.ts` | Vertex AI Pipelines REST API with Workload Identity |
| In-memory session store | `connect-redis` + `ioredis` → Cloud Memorystore |
| In-memory cache (`Map`) | `ioredis` → Cloud Memorystore (same Redis instance) |
| `config.runtime.json` | Firestore (single document) or Cloud Storage JSON blob |

Adapter swap is isolated to `src/adapters/` — no changes to services or controllers required.
