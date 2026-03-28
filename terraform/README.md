# DevOps Console — Terraform

Provisions all GCP infrastructure required to run the DevOps Console on Cloud Run.

---

## Resources Created

| File | Resources |
|---|---|
| `apis.tf` | Enables 6 GCP APIs on the project |
| `networking.tf` | VPC, subnet, VPC Access Connector (Cloud Run → Redis route) |
| `artifact_registry.tf` | Docker image repository |
| `redis.tf` | Cloud Memorystore Redis BASIC 1 GB (sessions + cache) |
| `secrets.tf` | Secret Manager secret for `SESSION_SECRET` |
| `iam.tf` | Backend service account, Secret Manager + Cloud Run IAM bindings |
| `cloud_run.tf` | Backend Cloud Run service, Frontend Cloud Run service |
| `outputs.tf` | Frontend URL, backend URL, Artifact Registry base URL, Redis host |

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.9
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated:
  ```bash
  gcloud auth application-default login
  ```
- A GCP project with billing enabled

---

## First-Time Deploy

### 1. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
env        = "dev"

backend_image  = "us-central1-docker.pkg.dev/your-gcp-project-id/devops-console/backend:latest"
frontend_image = "us-central1-docker.pkg.dev/your-gcp-project-id/devops-console/frontend:latest"

# Generate with: openssl rand -base64 32
session_secret = "your-32-plus-char-random-secret"

# Leave empty on first apply — see step 3
allowed_origins = ""
```

### 2. Create the Artifact Registry and push images

```bash
terraform init
terraform apply -target=google_artifact_registry_repository.images

# Authenticate Docker, then build and push
gcloud auth configure-docker REGION-docker.pkg.dev

docker build -t REGION-docker.pkg.dev/PROJECT_ID/devops-console/backend:latest  ../backend
docker build -t REGION-docker.pkg.dev/PROJECT_ID/devops-console/frontend:latest ../frontend

docker push REGION-docker.pkg.dev/PROJECT_ID/devops-console/backend:latest
docker push REGION-docker.pkg.dev/PROJECT_ID/devops-console/frontend:latest
```

### 3. Deploy all infrastructure

```bash
terraform apply
```

Note the outputs:

```
frontend_url          = "https://devops-console-dev-ui-xxxx.run.app"
backend_url           = "https://devops-console-dev-api-xxxx.run.app"
artifact_registry_url = "us-central1-docker.pkg.dev/your-project/devops-console"
redis_host            = "10.x.x.x"
```

### 4. Fix CORS (second apply)

The backend's `ALLOWED_ORIGINS` cannot be set until the frontend URL is known. Copy `frontend_url` from the outputs, add it to `terraform.tfvars`, and re-apply:

```hcl
# terraform.tfvars
allowed_origins = "https://devops-console-dev-ui-xxxx.run.app"
```

```bash
terraform apply   # Only the backend Cloud Run service is updated
```

The app is now fully deployed and accessible at the `frontend_url`.

---

## Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `project_id` | Yes | — | GCP project ID |
| `region` | No | `us-central1` | GCP region for all resources |
| `env` | No | `dev` | Environment label (`dev`, `staging`, `prod`) |
| `backend_image` | Yes | — | Full Artifact Registry URI with tag |
| `frontend_image` | Yes | — | Full Artifact Registry URI with tag |
| `session_secret` | Yes | — | express-session signing secret (min 32 chars, sensitive) |
| `allowed_origins` | No | `""` | Frontend URL for CORS — set after first apply |

---

## Outputs

| Output | Description |
|---|---|
| `frontend_url` | Public frontend Cloud Run URL |
| `backend_url` | Backend Cloud Run URL (used by nginx proxy in frontend) |
| `artifact_registry_url` | Docker push base path — append `/backend:TAG` or `/frontend:TAG` |
| `redis_host` | Redis private IP — reachable only from within the VPC |

---

## Resource Naming

GCP enforces character limits on some resource types. This module uses a short prefix for those:

| Resource type | Name pattern | Char limit |
|---|---|---|
| VPC connector | `dc-{env}-conn` | 25 |
| Service account | `dc-{env}-backend` | 30 |
| All others | `devops-console-{env}-*` | varies (all within limits) |

---

## Updating Images

To deploy a new image without changing infrastructure:

```bash
docker build -t REGION-docker.pkg.dev/PROJECT_ID/devops-console/backend:v2 ../backend
docker push  REGION-docker.pkg.dev/PROJECT_ID/devops-console/backend:v2

# Update terraform.tfvars
backend_image = "...backend:v2"

terraform apply   # Only the backend Cloud Run revision is updated
```

---

## Tearing Down

```bash
terraform destroy
```

Note: `disable_on_destroy = false` is set on all API enablements to avoid accidentally disabling shared project APIs.

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │         GCP Project              │
                        │                                  │
  Browser ──HTTPS──▶   │  Cloud Run: frontend (nginx)     │
                        │    - serves Angular static files │
                        │    - proxies /api/* via nginx    │
                        │           │ HTTPS                │
                        │           ▼                      │
                        │  Cloud Run: backend (Node.js)    │
                        │    - VPC connector attached      │
                        │           │ private IP           │
                        │           ▼                      │
                        │  Cloud Memorystore (Redis)       │
                        │    - sessions + cache            │
                        │                                  │
                        │  Secret Manager                  │
                        │    - SESSION_SECRET              │
                        │                                  │
                        │  Artifact Registry               │
                        │    - backend:TAG                 │
                        │    - frontend:TAG                │
                        └─────────────────────────────────┘
```

---

## Production Hardening Checklist

- [ ] Set `ingress = INGRESS_TRAFFIC_INTERNAL_ONLY` on the backend Cloud Run service
- [ ] Replace `allUsers` invoker on backend with the frontend service account only
- [ ] Enable Cloud IAP on the frontend for org-only access (`--iap` flag or Load Balancer + IAP)
- [ ] Wire `REDIS_HOST` / `REDIS_PORT` into the backend with `connect-redis` + `ioredis`
- [ ] Replace JSON file config store with Firestore or Cloud Storage
- [ ] Configure a Cloud Build or GitHub Actions pipeline to automate image builds on push
- [ ] Set `min_instance_count = 1` on the backend if cold-start latency is unacceptable
