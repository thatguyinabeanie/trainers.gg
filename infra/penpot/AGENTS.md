# infra/penpot

Local Penpot design environment — self-hosted Figma alternative with MCP support.

## Purpose

Provides a local Penpot instance for trainers.gg design work. Design tokens from
`@trainers/theme` are exported into Penpot via `design/tokens/tokens.json`.
The Penpot MCP server (configured in `.mcp.json`) lets Claude Code read and
modify designs directly.

## Key Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Penpot service stack |
| `local-dev.sh` | Start all services |
| `Makefile` | `make up / down / reset / logs` |
| `.env.example` | Required env var template |

## First-Time Setup

1. Generate a secret key: `openssl rand -hex 32`
2. Add `PENPOT_SECRET_KEY=<value>` to root `.env.local`
3. `make up` — starts Penpot at http://localhost:9001
4. Register at http://localhost:9001/auth/register (email verification disabled locally)

## Access Token (for MCP)

After logging in:
1. Profile → Access Tokens → Create new token
2. Add `PENPOT_ACCESS_TOKEN=<token>` to root `.env.local`
3. Restart Claude Code to pick up the new env var

## Design Token Sync

Run `pnpm --filter @trainers/theme export:penpot` → regenerates `design/tokens/tokens.json`.
In Penpot: Assets panel → Design Tokens → Import → select the file.

## Ports

| Service | Port | Notes |
|---|---|---|
| Penpot UI | 9001 | Main design app |
| Mailcatcher | 1080 | View outbound emails locally |
