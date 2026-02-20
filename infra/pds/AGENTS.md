# infra/pds

Self-hosted Bluesky PDS (Personal Data Server) deployed to Fly.io at `pds.trainers.gg`.

## Purpose

Handles `@username.trainers.gg` handles and AT Protocol identity for all platform users. Every signup provisions a PDS account via the `provision-pds` edge function.

## Key Files

| File | Purpose |
| --- | --- |
| `fly.toml` | Fly.io deployment config |
| `deploy.sh` | Deploy to Fly.io |
| `setup.sh` | Initial PDS setup |
| `docker-compose.yml` | Local dev PDS instance |
| `local-dev.sh` | Start local PDS + ngrok tunnel |
| `create-account.sh` | Manual account creation script |

## Deployment

Deploy via `deploy.sh` or Fly.io dashboard. Changes to PDS config require a redeploy — this is infrastructure, not auto-deployed via git like edge functions.

## Local Dev

Use `docker-compose.yml` + `local-dev.sh` with ngrok tunnel (`infra/ngrok/`) to test PDS locally without touching production.
