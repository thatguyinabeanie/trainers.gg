# Penpot Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up a self-hosted Penpot instance, connect it to Claude Code via MCP, export OKLCH design tokens into Penpot's native format, and version-control design assets inside the monorepo.

**Architecture:** Four independent deliverables in order — infra first (Docker Compose), then MCP wiring, then the token export script, then the design directory scaffold. Each phase is usable on its own.

**Tech Stack:** Docker Compose, Penpot (penpotapp/frontend + backend + exporter), PostgreSQL 15, Redis 7, `@penpot/mcp` MCP server, tsx (already in workspace catalog), W3C Design Tokens Community Group (DTCG) JSON format.

**No tests for Tasks 1–3:** Infrastructure and MCP config have nothing logic-testable. Token export script (Task 4) follows the same pattern as `packages/theme/scripts/generate.ts` which is also untested — `@trainers/theme` has no Jest setup.

---

## Task 1: Design Directory Scaffold

**Files:**
- Create: `design/README.md`
- Create: `design/tokens/.gitkeep`
- Create: `design/exports/.gitkeep`
- Create: `design/backups/.gitkeep`

**Step 1: Create `design/README.md`**

```markdown
# Design

Version-controlled design assets for trainers.gg.

## Structure

| Directory | Contents |
|---|---|
| `tokens/` | W3C DTCG tokens generated from `@trainers/theme` |
| `exports/` | SVG/PNG assets exported from Penpot |
| `backups/` | `.penpot` project backup files |

## Token Sync Workflow

1. Change tokens in `packages/theme/src/`
2. Run `pnpm --filter @trainers/theme export:penpot`
3. Commit both the TS change and `design/tokens/tokens.json`
4. In Penpot: Assets → Design Tokens → Import → select `design/tokens/tokens.json`

## Local Penpot

Start with `make -C infra/penpot up` — UI at http://localhost:9001.
```

**Step 2: Create the three `.gitkeep` files**

```bash
mkdir -p design/tokens design/exports design/backups
touch design/tokens/.gitkeep design/exports/.gitkeep design/backups/.gitkeep
```

**Step 3: Commit**

```bash
git add design/
git commit -m "chore: scaffold design/ directory for Penpot assets"
```

---

## Task 2: Penpot Docker Compose Infrastructure

**Files:**
- Create: `infra/penpot/docker-compose.yml`
- Create: `infra/penpot/.env.example`
- Create: `infra/penpot/local-dev.sh`
- Create: `infra/penpot/Makefile`
- Create: `infra/penpot/AGENTS.md`
- Create: `infra/penpot/CLAUDE.md` (symlink → AGENTS.md)

**Step 1: Create `infra/penpot/docker-compose.yml`**

```yaml
# Local Penpot Design Environment
#
# Penpot is an open-source Figma alternative with MCP support.
# UI runs at http://localhost:9001
# Email (mailcatcher) at http://localhost:1080
#
# PENPOT_SECRET_KEY must be set in root .env.local
# Generate with: openssl rand -hex 32

services:
  penpot-frontend:
    image: penpotapp/frontend:latest
    restart: "no"
    ports:
      - "9001:80"
    depends_on:
      - penpot-backend
      - penpot-exporter
    environment:
      PENPOT_FLAGS: "enable-login-with-password"
    networks:
      - penpot

  penpot-backend:
    image: penpotapp/backend:latest
    restart: "no"
    volumes:
      - penpot-assets:/opt/data/assets
    depends_on:
      - penpot-postgres
      - penpot-redis
    environment:
      PENPOT_FLAGS: "enable-login-with-password enable-smtp enable-prepl-server disable-email-verification"
      PENPOT_SECRET_KEY: "${PENPOT_SECRET_KEY}"
      PENPOT_PREPL_HOST: "0.0.0.0"
      PENPOT_PUBLIC_URI: "http://localhost:9001"
      PENPOT_DATABASE_URI: "postgresql://penpot-postgres/penpot"
      PENPOT_DATABASE_USERNAME: "penpot"
      PENPOT_DATABASE_PASSWORD: "penpot"
      PENPOT_REDIS_URI: "redis://penpot-redis/0"
      PENPOT_ASSETS_STORAGE_BACKEND: "assets-fs"
      PENPOT_STORAGE_ASSETS_FS_DIRECTORY: "/opt/data/assets"
      PENPOT_TELEMETRY_ENABLED: "false"
      PENPOT_SMTP_DEFAULT_FROM: "no-reply@penpot.local"
      PENPOT_SMTP_DEFAULT_REPLY_TO: "no-reply@penpot.local"
      PENPOT_SMTP_HOST: "penpot-mailcatcher"
      PENPOT_SMTP_PORT: "1025"
      PENPOT_SMTP_TLS: "false"
      PENPOT_SMTP_SSL: "false"
    networks:
      - penpot

  penpot-exporter:
    image: penpotapp/exporter:latest
    restart: "no"
    environment:
      PENPOT_PUBLIC_URI: "http://penpot-frontend"
      PENPOT_REDIS_URI: "redis://penpot-redis/0"
    networks:
      - penpot

  penpot-postgres:
    image: postgres:15
    restart: "no"
    volumes:
      - penpot-postgres:/var/lib/postgresql/data
    environment:
      POSTGRES_INITDB_ARGS: "--data-checksums"
      POSTGRES_DB: "penpot"
      POSTGRES_USER: "penpot"
      POSTGRES_PASSWORD: "penpot"
    networks:
      - penpot

  penpot-redis:
    image: redis:7
    restart: "no"
    networks:
      - penpot

  penpot-mailcatcher:
    image: sj26/mailcatcher:latest
    restart: "no"
    ports:
      - "1080:1080"
    networks:
      - penpot

volumes:
  penpot-postgres:
    name: trainers-penpot-postgres
  penpot-assets:
    name: trainers-penpot-assets

networks:
  penpot:
    name: trainers-penpot
```

**Step 2: Create `infra/penpot/.env.example`**

```bash
# Penpot local development
# Add these to root .env.local — they are symlinked into packages automatically.

# Required: random secret for session signing
# Generate with: openssl rand -hex 32
PENPOT_SECRET_KEY=

# Required after first login: generate from Penpot profile → Access Tokens
# Needed for MCP server access from Claude Code
PENPOT_ACCESS_TOKEN=
```

**Step 3: Create `infra/penpot/local-dev.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  echo "Add PENPOT_SECRET_KEY to root .env.local (see infra/penpot/.env.example)"
  exit 1
fi

echo "🎨 Starting Penpot..."
docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.yml" up -d

echo ""
echo "✅ Penpot is running:"
echo "   Design:  http://localhost:9001"
echo "   Email:   http://localhost:1080"
echo ""
echo "First time? Register at http://localhost:9001/auth/register"
echo "Email verification is disabled — registration completes immediately."
```

Make it executable: `chmod +x infra/penpot/local-dev.sh`

**Step 4: Create `infra/penpot/Makefile`**

```makefile
SCRIPT_DIR  := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
REPO_ROOT   := $(abspath $(SCRIPT_DIR)../..)
ENV_FILE    := $(REPO_ROOT)/.env.local
COMPOSE     := docker compose --env-file $(ENV_FILE) -f $(SCRIPT_DIR)docker-compose.yml

.PHONY: up down reset logs

up:
	$(COMPOSE) up -d
	@echo "🎨 Penpot: http://localhost:9001 | Email: http://localhost:1080"

down:
	$(COMPOSE) down

reset:
	$(COMPOSE) down -v
	@echo "✅ Volumes cleared — fresh DB on next start"

logs:
	$(COMPOSE) logs -f
```

**Step 5: Create `infra/penpot/AGENTS.md`**

```markdown
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
```

**Step 6: Create `infra/penpot/CLAUDE.md` symlink**

```bash
cd infra/penpot && ln -s AGENTS.md CLAUDE.md
```

**Step 7: Commit**

```bash
git add infra/penpot/
git commit -m "feat: add Penpot local dev environment via Docker Compose"
```

---

## Task 3: MCP Wiring

**Files:**
- Modify: `.mcp.json` (root)
- Modify: `.env.local` (root) — add `PENPOT_ACCESS_TOKEN` placeholder

**Step 1: Add `PENPOT_ACCESS_TOKEN` placeholder to root `.env.local`**

Open `.env.local` and add at the end:

```bash
# Penpot MCP (generate from Penpot profile → Access Tokens after first login)
PENPOT_ACCESS_TOKEN=
```

**Step 2: Add the penpot entry to `.mcp.json`**

Current `.mcp.json`:
```json
{
  "mcpServers": {
    "playwright-bridge": { ... },
    "shadcn": { ... },
    "memory": { ... }
  }
}
```

Add the `penpot` key inside `mcpServers`:

```json
{
  "mcpServers": {
    "playwright-bridge": {
      "command": "npx",
      "args": ["@playwright/mcp", "--browser", "chrome", "--extension"]
    },
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "penpot": {
      "command": "npx",
      "args": ["-y", "@penpot/mcp@latest"],
      "env": {
        "PENPOT_BASEURL": "http://localhost:9001",
        "PENPOT_ACCESS_TOKEN": "${PENPOT_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Step 3: Verify the JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8')); console.log('✅ valid JSON')"
```

Expected: `✅ valid JSON`

**Step 4: Commit**

```bash
git add .mcp.json
git commit -m "feat: add Penpot MCP server to Claude Code config"
```

Note: `.env.local` is gitignored — do not commit it.

---

## Task 4: Token Export Script

**Files:**
- Create: `packages/theme/scripts/export-penpot.ts`
- Modify: `packages/theme/package.json` (add `export:penpot` script)

No tests: `@trainers/theme` has no Jest setup. This script follows the same
pattern as the existing `generate.ts` which is also untested.

**Step 1: Create `packages/theme/scripts/export-penpot.ts`**

```typescript
#!/usr/bin/env node
/**
 * Penpot Token Export Script
 *
 * Converts trainers.gg OKLCH design tokens to W3C Design Tokens Community
 * Group (DTCG) format for import into Penpot.
 *
 * Run: pnpm --filter @trainers/theme export:penpot
 * Output: design/tokens/tokens.json (relative to monorepo root)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { colors } from "../src/primitives/colors.oklch.js";
import { semanticTokens } from "../src/tokens/semantic.js";
import { oklchToHex } from "../src/utils/oklch-to-hex.js";
import type { OklchColor } from "../src/primitives/colors.oklch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ is at packages/theme/scripts/ — three levels up reaches monorepo root
const outputDir = join(__dirname, "../../../design/tokens");
const outputFile = join(outputDir, "tokens.json");

type DtcgColorToken = { $value: string; $type: "color" };
type DtcgGroup = Record<string, DtcgColorToken>;

function toToken(color: OklchColor): DtcgColorToken {
  return { $value: oklchToHex(color), $type: "color" };
}

function paletteToGroup(palette: Record<string, OklchColor>): DtcgGroup {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [key, toToken(value)])
  );
}

const output = {
  color: {
    primary: paletteToGroup(colors.primary),
    neutral: paletteToGroup(colors.neutral),
    destructive: paletteToGroup(colors.destructive),
  },
  semantic: {
    light: paletteToGroup(semanticTokens.light),
    dark: paletteToGroup(semanticTokens.dark),
  },
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n");

const tokenCount =
  Object.values(output.color).reduce(
    (sum, g) => sum + Object.keys(g).length,
    0
  ) +
  Object.values(output.semantic).reduce(
    (sum, g) => sum + Object.keys(g).length,
    0
  );

console.log(`✅ Exported ${tokenCount} tokens to ${outputFile}`);
```

**Step 2: Add `export:penpot` to `packages/theme/package.json`**

Current `scripts` block:
```json
"scripts": {
  "build": "tsx scripts/generate.ts",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings 0 --cache",
  "format": "prettier --write ...",
  "format:check": "prettier --check ..."
}
```

Add `export:penpot` after `build`:
```json
"scripts": {
  "build": "tsx scripts/generate.ts",
  "export:penpot": "tsx scripts/export-penpot.ts",
  "typecheck": "tsc --noEmit",
  ...
}
```

**Step 3: Run the script and verify output**

```bash
pnpm --filter @trainers/theme export:penpot
```

Expected output:
```
✅ Exported 76 tokens to .../design/tokens/tokens.json
```

Then inspect the file:
```bash
node -e "
const t = JSON.parse(require('fs').readFileSync('design/tokens/tokens.json', 'utf8'));
console.log('color groups:', Object.keys(t.color));
console.log('primary.600:', t.color.primary['600']);
console.log('semantic light keys:', Object.keys(t.semantic.light).slice(0, 4));
"
```

Expected:
```
color groups: [ 'primary', 'neutral', 'destructive' ]
primary.600: { '$value': '#4da0a0', '$type': 'color' }
semantic light keys: [ 'background', 'foreground', 'card', 'cardForeground' ]
```

(Hex value for primary.600 may vary slightly due to OKLCH → sRGB rounding — as long as it's a teal hex string, it's correct.)

**Step 4: Commit**

```bash
git add packages/theme/scripts/export-penpot.ts packages/theme/package.json design/tokens/tokens.json
git commit -m "feat: add Penpot token export script and generated tokens"
```

---

## Done

After all four tasks, the setup is:

| What | Where |
|---|---|
| Local Penpot | `make -C infra/penpot up` → http://localhost:9001 |
| MCP access | Claude Code picks up `penpot` MCP server automatically once `PENPOT_ACCESS_TOKEN` is set |
| Token sync | `pnpm --filter @trainers/theme export:penpot` → re-import in Penpot |
| Design assets | `design/tokens/`, `design/exports/`, `design/backups/` |
