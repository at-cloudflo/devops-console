locals {
  prefix = "devops-console-${var.env}"

  # GCP limits: VPC connector ≤ 25 chars, service account ≤ 30 chars
  connector_name = "dc-${var.env}-conn"
  sa_backend     = "dc-${var.env}-backend"

  labels = {
    app = "devops-console"
    env = var.env
  }
}
