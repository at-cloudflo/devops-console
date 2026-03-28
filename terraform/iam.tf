resource "google_service_account" "backend" {
  account_id   = local.sa_backend
  display_name = "DevOps Console Backend (${var.env})"
}

# Backend reads SESSION_SECRET from Secret Manager
resource "google_secret_manager_secret_iam_member" "backend_session_secret" {
  secret_id = google_secret_manager_secret.session_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# Frontend is publicly accessible
# Production hardening: replace allUsers with Cloud IAP or your org's domain
resource "google_cloud_run_v2_service_iam_member" "frontend_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Backend is publicly accessible so the nginx proxy (running inside the frontend
# container) can reach it over HTTPS. CORS on the backend restricts browser access.
# Production hardening: set ingress=INGRESS_TRAFFIC_INTERNAL_ONLY and grant
# roles/run.invoker only to the frontend service account.
resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
