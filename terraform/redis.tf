resource "google_redis_instance" "main" {
  name           = "${local.prefix}-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.main.id
  connect_mode       = "DIRECT_PEERING"

  redis_version = "REDIS_7_2"
  display_name  = "DevOps Console (${var.env})"
  labels        = local.labels

  depends_on = [
    google_project_service.apis["redis.googleapis.com"],
    google_compute_network.main,
  ]
}
