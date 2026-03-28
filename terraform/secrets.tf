resource "google_secret_manager_secret" "session_secret" {
  secret_id = "${local.prefix}-session-secret"

  replication {
    auto {}
  }

  labels     = local.labels
  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret      = google_secret_manager_secret.session_secret.id
  secret_data = var.session_secret
}
