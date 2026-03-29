---
name: infrastructure
description: Use when working with PDS (Bluesky Personal Data Server on Fly.io) or ngrok tunnel configuration for local development
---

# Infrastructure

Self-hosted services supporting the trainers.gg platform.

## PDS (Bluesky Personal Data Server)

**Location**: `infra/pds/`
**Production URL**: `pds.trainers.gg`
**Hosting**: Fly.io

The PDS handles `@username.trainers.gg` Bluesky handles for decentralized identity.

### Deployment

- Deploy via `deploy.sh` or the Fly.io dashboard
- **Not git-deployed** — changes to `infra/pds/` do not auto-deploy
- Manual deployment is required after making changes

### Local Development

- Use `docker-compose.yml` + `local-dev.sh` for local PDS testing
- The local PDS runs in Docker and mimics the production Fly.io environment

## ngrok (Local Dev Tunnel)

**Location**: `infra/ngrok/`
**Purpose**: Tunnels port 3000 to a public HTTPS URL for local development

### How It Works

- Starts automatically with `pnpm dev`
- Configure via `NGROK_STATIC_DOMAIN` in `.env.ngrok`
- Auto-updates `NEXT_PUBLIC_SITE_URL` to the tunnel URL

### Why It's Needed

AT Protocol OAuth requires a publicly accessible callback URL. The ngrok tunnel provides this during local development, allowing Bluesky authentication flows to complete against `localhost:3000`.
