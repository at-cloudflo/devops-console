# ──────────────────────────────────────────────────────────────────────────────
# DevOps Console — Frontend
#
# Strategy: build in CI, package in Docker.
#   The CI agent runs npm install + ng build against the private registry.
#   This image only receives the compiled static files — npm, node, and all
#   build credentials never enter the image or any intermediate layer.
#
# CI steps (Azure DevOps pipeline) — run BEFORE docker build:
#   1. Configure .npmrc with private registry (see .npmrc.example)
#   2. npm ci
#   3. npm run build
#   4. docker build -f Dockerfile -t <registry>/devops-console-frontend:<tag> .
#
# Base image: nginxinc/nginx-unprivileged
#   - Runs as UID 101 (nginx) — never root
#   - Listens on 8080 — no privileged port binding required
#   - Minimal Alpine base with no package manager in the final layer
# ──────────────────────────────────────────────────────────────────────────────

FROM nginxinc/nginx-unprivileged:1.27-alpine

# ── Image metadata ─────────────────────────────────────────────────────────
LABEL org.opencontainers.image.title="devops-console-frontend" \
      org.opencontainers.image.description="DevOps Console — Angular frontend served by nginx" \
      org.opencontainers.image.source="https://github.com/your-org/devops-console"

# No RUN steps — closed network, no access to Alpine package registry.
# Base image hardening is achieved by:
#   1. Using a specific image tag (pin to digest in production — see comment below)
#   2. The nginx-unprivileged image already runs as UID 101, never root
#   3. All apk tooling is irrelevant — the image is never modified at build time
#
# Production tip: replace the tag above with a digest for supply-chain pinning:
#   FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:<digest>
# Obtain the digest with: docker inspect --format='{{index .RepoDigests 0}}' nginxinc/nginx-unprivileged:1.27-alpine

# ── nginx configuration ────────────────────────────────────────────────────
# Replace the default config with our hardened version.
COPY --chown=101:101 nginx.conf /etc/nginx/nginx.conf

# ── Static assets ─────────────────────────────────────────────────────────
# Angular 17+ application builder places browser assets under browser/.
# Built by CI: npm run build  →  dist/devops-console/browser/
COPY --chown=101:101 dist/devops-console/browser /usr/share/nginx/html

# ── Drop to non-root ───────────────────────────────────────────────────────
USER 101

# ── Networking ────────────────────────────────────────────────────────────
EXPOSE 8080

# ── Liveness probe ────────────────────────────────────────────────────────
# nginx-unprivileged:alpine includes busybox wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1
