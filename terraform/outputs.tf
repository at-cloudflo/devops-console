output "frontend_url" {
  description = "Frontend Cloud Run URL — paste this into allowed_origins in terraform.tfvars and re-apply"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_url" {
  description = "Backend Cloud Run URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "artifact_registry_url" {
  description = "Docker image push base URL — append /backend:TAG or /frontend:TAG"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "redis_host" {
  description = "Redis private IP — reachable only from the VPC"
  value       = google_redis_instance.main.host
}
