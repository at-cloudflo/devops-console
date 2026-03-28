terraform {
  required_version = ">= 1.9"

  # Bucket and prefix are supplied via -backend-config in CI/CD.
  # Local use: terraform init -backend-config="bucket=YOUR_BUCKET" -backend-config="prefix=devops-console/dev"
  backend "gcs" {}

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
