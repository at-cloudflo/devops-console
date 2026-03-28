resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = "devops-console"
  description   = "DevOps Console container images"
  format        = "DOCKER"
  labels        = local.labels

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
