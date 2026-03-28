# ──────────────────────────────────────────────────────────────────────────────
# DevOps Console — Backend
#
# Strategy: build in CI, package in Docker.
#   The CI agent compiles TypeScript and prunes dev dependencies against the
#   private registry. This image only receives the compiled JS + prod modules.
#   The TypeScript compiler, all dev tools, and registry credentials never
#   appear in any image layer.
#
# CI steps (Azure DevOps pipeline) — run BEFORE docker build:
#   1. Configure .npmrc with private registry (see .npmrc.example)
#   2. npm ci                         ← installs all deps (dev included for tsc)
#   3. npm run build                  ← tsc → dist/
#   4. npm prune --omit=dev           ← strips devDependencies from node_modules
#   5. docker build -f Dockerfile -t <registry>/devops-console-backend:<tag> .
#
# Base image: gcr.io/distroless/nodejs22-debian12
#   - No shell, no package manager, no coreutils — minimal attack surface
#   - Runs as UID 65532 (nonroot) by default
#   - ~50 MB image vs ~200 MB for node:22-alpine
#   - Debian 12 security patches via Google's distroless build pipeline
# ──────────────────────────────────────────────────────────────────────────────

FROM gcr.io/distroless/nodejs22-debian12:nonroot

# ── Image metadata ─────────────────────────────────────────────────────────
LABEL org.opencontainers.image.title="devops-console-backend" \
      org.opencontainers.image.description="DevOps Console — Node.js BFF/aggregation API" \
      org.opencontainers.image.source="https://github.com/your-org/devops-console"

WORKDIR /app

# ── Production node_modules ────────────────────────────────────────────────
# Copied from CI after `npm prune --omit=dev` — no dev deps, no build tools.
COPY --chown=65532:65532 node_modules ./node_modules

# ── Compiled application ───────────────────────────────────────────────────
# Output of `npm run build` (tsc). Entry point: dist/server.js
COPY --chown=65532:65532 dist ./dist

# ── Package manifest ───────────────────────────────────────────────────────
# Required at runtime for version metadata; no scripts are executed from it.
COPY --chown=65532:65532 package.json ./

# ── Runtime configuration ──────────────────────────────────────────────────
# All secrets and config are injected at runtime via environment variables
# or Secret Manager. Never COPY .env files into the image.
ENV NODE_ENV=production \
    PORT=3000

# ── Drop to non-root (already set by :nonroot tag, explicit for clarity) ───
USER nonroot

# ── Networking ────────────────────────────────────────────────────────────
EXPOSE 3000

# ── Liveness probe ────────────────────────────────────────────────────────
# Distroless has no wget/curl — use node directly.
# node binary path in distroless nodejs22: /nodejs/bin/node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", \
         "const h=require('http');h.get('http://127.0.0.1:3000/health',r=>{process.exitCode=r.statusCode===200?0:1}).on('error',()=>{process.exitCode=1})"]
