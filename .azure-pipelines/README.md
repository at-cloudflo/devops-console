# Azure DevOps Pipelines

Three pipelines — one per component — each triggered only when its folder changes.

---

## Pipeline Summary

| File | Watches | CI (all branches) | CD (main only) |
|---|---|---|---|
| `backend.yml` | `backend/**` | lint, TypeScript compile | docker build → push → `gcloud run deploy` |
| `frontend.yml` | `frontend/**` | lint, Angular prod build | docker build → push → `gcloud run deploy` |
| `terraform.yml` | `terraform/**` | init, validate, plan | apply (requires environment approval) |

---

## Setup Checklist

- [ ] Create GCP service accounts and assign roles
- [ ] Create GCS bucket for Terraform state
- [ ] Create Azure DevOps variable groups
- [ ] Create Azure DevOps environments
- [ ] Register each pipeline in Azure DevOps

---

## Step 1 — GCP Service Accounts

Two service accounts are recommended: one for application CI/CD (build + deploy) and one for Terraform (infrastructure).

### 1a. CI/CD service account

Used by `backend.yml` and `frontend.yml` to push images and deploy Cloud Run revisions.

```bash
gcloud iam service-accounts create devops-console-cicd \
  --display-name="DevOps Console CI/CD" \
  --project=PROJECT_ID
```

**Required roles:**

| Role | Why |
|---|---|
| `roles/artifactregistry.writer` | Push Docker images to Artifact Registry |
| `roles/run.admin` | Create and update Cloud Run services and revisions |
| `roles/iam.serviceAccountUser` | Impersonate the Cloud Run runtime service account (`dc-{env}-backend`) during deploy |

```bash
PROJECT=PROJECT_ID
SA=devops-console-cicd@${PROJECT}.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/iam.serviceAccountUser"
```

### 1b. Terraform service account

Used by `terraform.yml` to provision all GCP resources.

```bash
gcloud iam service-accounts create devops-console-terraform \
  --display-name="DevOps Console Terraform" \
  --project=PROJECT_ID
```

**Required roles:**

| Role | Resource it manages |
|---|---|
| `roles/serviceusage.serviceUsageAdmin` | Enable GCP APIs (`apis.tf`) |
| `roles/compute.networkAdmin` | VPC, subnets (`networking.tf`) |
| `roles/vpcaccess.admin` | VPC Access Connector (`networking.tf`) |
| `roles/artifactregistry.admin` | Artifact Registry repository (`artifact_registry.tf`) |
| `roles/redis.admin` | Cloud Memorystore Redis instance (`redis.tf`) |
| `roles/secretmanager.admin` | Secret Manager secrets and versions (`secrets.tf`) |
| `roles/iam.serviceAccountAdmin` | Create the backend runtime service account (`iam.tf`) |
| `roles/resourcemanager.projectIamAdmin` | Bind `roles/run.invoker` and `roles/secretmanager.secretAccessor` (`iam.tf`) |
| `roles/run.admin` | Cloud Run services (`cloud_run.tf`) |
| `roles/storage.admin` | Read/write Terraform state in the GCS bucket |

```bash
PROJECT=PROJECT_ID
SA=devops-console-terraform@${PROJECT}.iam.gserviceaccount.com

for ROLE in \
  roles/serviceusage.serviceUsageAdmin \
  roles/compute.networkAdmin \
  roles/vpcaccess.admin \
  roles/artifactregistry.admin \
  roles/redis.admin \
  roles/secretmanager.admin \
  roles/iam.serviceAccountAdmin \
  roles/resourcemanager.projectIamAdmin \
  roles/run.admin \
  roles/storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:${SA}" \
    --role="$ROLE"
done
```

### 1c. Export JSON keys

```bash
# CI/CD key — used in devops-console-gcp variable group
gcloud iam service-accounts keys create cicd-key.json \
  --iam-account=devops-console-cicd@PROJECT_ID.iam.gserviceaccount.com

# Terraform key — used in devops-console-tf variable group
gcloud iam service-accounts keys create terraform-key.json \
  --iam-account=devops-console-terraform@PROJECT_ID.iam.gserviceaccount.com
```

Store the JSON content as secret pipeline variables (see Step 3). Delete the local key files after.

---

## Step 2 — Terraform State Bucket

Terraform stores its state in a GCS bucket. Create it once — it is not managed by Terraform itself.

```bash
gcloud storage buckets create gs://YOUR_BUCKET_NAME \
  --project=PROJECT_ID \
  --location=REGION \
  --uniform-bucket-level-access

# Enable versioning so state history is preserved
gcloud storage buckets update gs://YOUR_BUCKET_NAME --versioning
```

Grant the Terraform service account access to the bucket:

```bash
gcloud storage buckets add-iam-policy-binding gs://YOUR_BUCKET_NAME \
  --member="serviceAccount:devops-console-terraform@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

## Step 3 — Azure DevOps Variable Groups

Create two variable groups under **Pipelines → Library**.

### Group: `devops-console-gcp`

Used by all three pipelines.

| Variable | Value | Secret |
|---|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID | No |
| `GCP_REGION` | e.g. `us-central1` | No |
| `ENV` | `dev` (or `staging` / `prod`) | No |
| `GCP_SA_KEY` | Full JSON content of `cicd-key.json` | **Yes** |

### Group: `devops-console-tf`

Used only by `terraform.yml`.

| Variable | Value | Secret |
|---|---|---|
| `TF_STATE_BUCKET` | GCS bucket name from Step 2 | No |
| `TF_VAR_backend_image` | e.g. `us-central1-docker.pkg.dev/PROJECT/devops-console/backend:latest` | No |
| `TF_VAR_frontend_image` | e.g. `us-central1-docker.pkg.dev/PROJECT/devops-console/frontend:latest` | No |
| `TF_VAR_allowed_origins` | Frontend Cloud Run URL (empty on first run, fill after first apply) | No |
| `TF_VAR_session_secret` | 32+ character random string (`openssl rand -base64 32`) | **Yes** |
| `GCP_SA_KEY` | Full JSON content of `terraform-key.json` | **Yes** |

> `GCP_SA_KEY` in `devops-console-tf` overrides the value from `devops-console-gcp` for the Terraform pipeline, so the Terraform SA key is used instead of the CICD SA key.

---

## Step 4 — Azure DevOps Environments

Environments gate the CD and apply stages with a human approval step.

1. Go to **Pipelines → Environments → New environment**
2. Create an environment named `dev` (repeat for `staging` / `prod`)
3. Open the environment → **Approvals and checks → Add → Approvals**
4. Add the team members who must approve before Terraform applies or Cloud Run deploys

The `terraform.yml` apply stage and the `backend.yml` / `frontend.yml` deploy jobs both reference `environment: $(ENV)` — they will pause and wait for approval before proceeding.

---

## Step 5 — Register Pipelines in Azure DevOps

1. Go to **Pipelines → New pipeline**
2. Select your repository source
3. Choose **Existing Azure Pipelines YAML file**
4. Set the path to the pipeline file:
   - `.azure-pipelines/backend.yml`
   - `.azure-pipelines/frontend.yml`
   - `.azure-pipelines/terraform.yml`
5. Save (do not run yet)
6. Link the variable groups to each pipeline:
   - **Edit pipeline → Variables → Variable groups → Link variable group**
   - Link `devops-console-gcp` to all three pipelines
   - Link `devops-console-tf` to the Terraform pipeline only
7. Rename each pipeline for clarity (e.g. `devops-console-backend`, `devops-console-frontend`, `devops-console-terraform`)

---

## How the Pipelines Interact

```
Developer pushes to main
│
├── backend/** changed?
│   └── backend.yml triggers
│       ├── CI:  lint → tsc build
│       └── CD:  docker build → push to Artifact Registry
│                → gcloud run deploy devops-console-{env}-api
│
├── frontend/** changed?
│   └── frontend.yml triggers
│       ├── CI:  lint → ng build:prod
│       └── CD:  docker build → push to Artifact Registry
│                → gcloud run deploy devops-console-{env}-ui
│
└── terraform/** changed?
    └── terraform.yml triggers
        ├── Plan: terraform init → validate → plan → publish plan artifact
        └── Apply (after approval): download plan → terraform apply
```

On a pull request, only the CI / Plan stages run — nothing is pushed or deployed until the PR merges to main.

---

## Terraform — First Run Order

The Terraform pipeline and the backend/frontend pipelines depend on each other on first setup:

```
1. Run terraform.yml  → creates Artifact Registry, Cloud Run services, Redis, etc.
                         note the frontend_url output

2. Update TF_VAR_allowed_origins in devops-console-tf variable group
   with the frontend Cloud Run URL

3. Run terraform.yml again → updates backend CORS config

4. Build and push images via backend.yml and frontend.yml
   (or push manually — see ../terraform/README.md Step 1b)
```

After the first run, normal code changes trigger only the relevant pipeline automatically.

---

## Troubleshooting

**`PERMISSION_DENIED` on `gcloud run deploy`**
The CICD service account is missing `roles/iam.serviceAccountUser`. The deploying identity must be able to act as the Cloud Run runtime service account. Grant it on the project (Step 1a) or specifically on the `dc-{env}-backend` service account:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  dc-dev-backend@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:devops-console-cicd@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

**`denied: Permission "artifactregistry.repositories.uploadArtifacts" denied`**
The CICD service account is missing `roles/artifactregistry.writer`. Verify it was granted at the project level, not just the repository level.

**`Error: Failed to get existing workspaces` during `terraform init`**
The Terraform service account is missing access to the GCS state bucket. Verify `roles/storage.objectAdmin` was granted on the bucket (Step 2).

**`Error: googleapi: Error 403: The caller does not have permission` on `google_project_iam_member`**
The Terraform service account needs `roles/resourcemanager.projectIamAdmin`. This is required to bind `roles/run.invoker` and `roles/secretmanager.secretAccessor` in `iam.tf`.

**Plan succeeds on PR but apply fails on main**
The plan artifact is built in the `plan` stage and downloaded in the `apply` stage. If the pipeline is re-run without rebuilding the plan, the artifact may be stale or missing. Re-trigger from the `plan` stage.
