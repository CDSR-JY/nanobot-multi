# Nanobot Multi-Tenant Deployment Guide

This document is intentionally slimmed down for **multi-tenant Docker deployment only**.

## 1) What This Stack Includes

- `frontend`: Web UI (port `3080`)
- `gateway`: Auth, user-container orchestration, LLM proxy (port `8080`)
- `postgres`: Platform metadata/users/containers
- Per-user `nanobot-user-*` containers are created dynamically by `gateway`.

## 2) Prerequisites

- Docker + Docker Compose plugin available
- Host can access your configured LLM endpoint (`VLLM_API_BASE` or other provider)

## 3) Current `.env` Example

Create `/home/tsn/github_code/nanobot-multi/.env`:

```env
# Frontend -> gateway URL injected at build time
NEXT_PUBLIC_API_URL=http://10.45.110.210:8080

# LLM routing (vLLM / OpenAI-compatible endpoint)
VLLM_API_BASE=http://10.45.100.100:7102/v1
VLLM_API_KEY=sk
DEFAULT_MODEL=vllm/test-coder

# IMPORTANT: keep empty in offline vLLM mode unless you explicitly want OpenRouter fallback
OPENROUTER_API_KEY=

# IMPORTANT: set your own secret and keep it stable
JWT_SECRET=fefbb9885dc5a7bd365cf4e8d3725b806d02ee90bda638145feb6b9beab10567

# Optional provider keys (leave empty if unused)
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DASHSCOPE_API_KEY=
AIHUBMIX_API_KEY=
ANTHROPIC_API_KEY=
```

## 4) Database Volume (Important)

This project is configured to use external postgres volume `businessbot_pgdata`.
See [docker-compose.yml](/home/tsn/github_code/nanobot-multi/docker-compose.yml).

If you move to another machine, ensure this volume exists or adjust `volumes.pgdata.name`.

## 5) Build & Start

From project root:

```bash
cd /home/github_code/nanobot-multi

# Build user base image (required for per-user containers)
docker build -t nanobot:latest .

# Build and start platform services
docker compose up -d --build
```

## 6) How To Update After Changes

### A. Changed only `.env` (keys/model/jwt)

No image rebuild required. Recreate service containers:

```bash
docker compose up -d --force-recreate gateway frontend
```

If you changed `JWT_SECRET`, users must login again (old tokens become invalid).

### B. Changed frontend code

```bash
docker compose build frontend
docker compose up -d frontend
```

### C. Changed only `NEXT_PUBLIC_API_URL`

Rebuild frontend image (value is baked at build time):

```bash
docker compose build frontend --no-cache
docker compose up -d frontend
```

### D. Changed gateway code (`platform/`)

```bash
docker compose build gateway
docker compose up -d gateway
```

### E. Changed user runtime code (root `Dockerfile` / `nanobot/`)

```bash
docker build -t nanobot:latest .
# Existing user containers keep old image; recreate them to use new one
```

## 7) Verify Effective Runtime Config

```bash
# gateway env actually loaded
docker inspect nanobot-multi-gateway-1 --format '{{range .Config.Env}}{{println .}}{{end}}' \
| grep -E 'PLATFORM_DEFAULT_MODEL|PLATFORM_VLLM_API_BASE|PLATFORM_OPENROUTER_API_KEY|PLATFORM_JWT_SECRET'

# postgres volume mounted
docker inspect nanobot-multi-postgres-1 --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'

# user containers + model env
for c in $(docker ps --format '{{.Names}}' | grep '^nanobot-user-'); do
  echo "[$c]"
  docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep '^NANOBOT_AGENTS__DEFAULTS__MODEL='
done
```

## 8) Common Problems

### WebSocket 403

Usually stale/invalid token:
- `JWT_SECRET` changed
- token expired
- token user not found in current DB

Fix: clear browser site storage, then login again.

### `POST /llm/v1/chat/completions` returns 502

Usually upstream LLM issue:
- model not available in target endpoint
- API key invalid
- endpoint unreachable
- unintended fallback provider used

Check loaded env first (Section 7), then verify `VLLM_API_BASE` from host.

## 9) Safe Operations

- `docker rm <container>`: removes container only, keeps named volumes
- `docker compose down`: keeps named volumes
- `docker compose down -v`: removes compose volumes (danger)

Avoid `down -v` unless you intentionally want to delete data.
