# syntax=docker/dockerfile:1
# =============================================================================
# GPRetail Frontend — static SPA served by nginx.
#
# The SPA (dist/) is built by a NATIVE `npm run build` BEFORE this image is built
# (the CI `build-and-push` job runs it on the runner; do the same locally). vite/
# esbuild deadlocks at "transforming..." when run inside `docker build` (buildkit's
# exec sandbox), while a native build finishes in seconds — so this image only
# PACKAGES the pre-built dist/ into nginx.
#
# Build locally:
#   (cd frontend && npm ci && npm run build) && docker build -t gpretail-frontend ./frontend
#
# The API base URL is baked at build time by Vite; default "/api" keeps requests
# same-origin so the ingress routes them to the gateway without CORS.
# =============================================================================

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 80
