variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "env" {
  description = "Environment label — dev, staging, or prod"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "Must be dev, staging, or prod."
  }
}

variable "backend_image" {
  description = "Backend container image URI (full Artifact Registry path with tag)"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image URI (full Artifact Registry path with tag)"
  type        = string
}

variable "session_secret" {
  description = "express-session signing secret — minimum 32 random characters"
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = <<-EOT
    Comma-separated CORS origins allowed by the backend (e.g. the frontend Cloud Run URL).
    Leave empty on first apply. After apply, copy the frontend_url output here and re-apply.
  EOT
  type    = string
  default = ""
}
