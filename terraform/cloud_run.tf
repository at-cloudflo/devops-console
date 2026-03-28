# ── Backend ───────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.prefix}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    # VPC connector gives the backend container a route to the Redis private IP
    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "ALLOWED_ORIGINS"
        value = var.allowed_origins
      }
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.main.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.main.port)
      }
      # SESSION_SECRET is sourced from Secret Manager — never stored in plain env vars
      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.session_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_iam_member.backend_session_secret,
    google_vpc_access_connector.main,
  ]
}

# ── Frontend ──────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "${local.prefix}-ui"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = var.frontend_image

      ports {
        container_port = 80
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }

      # nginx uses BACKEND_URL to proxy /api/* to the backend service
      env {
        name  = "BACKEND_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_cloud_run_v2_service.backend,
  ]
}
