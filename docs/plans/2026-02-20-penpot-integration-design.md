# Penpot Integration Design

**Date:** 2026-02-20
**Status:** Approved

## Overview

Integrate Penpot (open-source, self-hostable Figma alternative) into the trainers.gg monorepo to establish a complete design workflow: local Docker setup, Claude Code MCP access, a token bridge from `@trainers/theme`, and version-controlled design files.

## Goals

- Self-host Penpot locally via Docker Compose for design work
- Wire the Penpot MCP server into Claude Code so designs can be read/modified programmatically
- Export existing OKLCH design tokens into Penpot's native W3C Design Tokens format
- Version-control design exports and backups inside the monorepo

## Architecture

Four phased deliverables, each independently useful:

```
Phase 1: infra/penpot/          — Docker Compose services
Phase 2: .mcp.json              — Penpot MCP server entry
Phase 3: packages/theme/        — Token export script
Phase 4: design/                — Version-controlled design files
```

---

## Phase 1: Infrastructure (`infra/penpot/`)

Mirrors the existing `infra/pds/` pattern.

### Files

```
infra/penpot/
├── docker-compose.yml
├── .env.example
├── local-dev.sh
├── Makefile
├── AGENTS.md
└── CLAUDE.md -> AGENTS.md
```

### Services

| Service | Image | Port |
|---|---|---|
| `penpot-frontend` | `penpotapp/frontend` | `localhost:9001` (external) |
| `penpot-backend` | `penpotapp/backend` | internal only |
| `penpot-exporter` | `penpotapp/exporter` | internal only |
| `postgres` | `postgres:15` | internal only |
| `redis` | `redis:7` | internal only |
| `mailcatcher` | `sj26/mailcatcher` | `localhost:1080` (email UI) |

Port 9001 avoids conflicts with Next.js (3000), PDS (3001), and Supabase (54321–54325).

### `local-dev.sh`

Loads `.env.local` (root, symlinked) and starts Docker Compose. Prints the Penpot URL and mailcatcher URL on success.

### `Makefile` targets

| Target | Action |
|---|---|
| `up` | Start all services |
| `down` | Stop all services |
| `reset` | Stop + delete volumes (fresh DB) |
| `logs` | Tail all service logs |

---

## Phase 2: MCP Wiring (`.mcp.json`)

Add the Penpot MCP server to the existing `.mcp.json` at the monorepo root.

```json
"penpot": {
  "command": "npx",
  "args": ["-y", "@penpot/mcp@latest"],
  "env": {
    "PENPOT_BASEURL": "http://localhost:9001",
    "PENPOT_ACCESS_TOKEN": "${PENPOT_ACCESS_TOKEN}"
  }
}
```

`PENPOT_ACCESS_TOKEN` is added to root `.env.local`. Generated from Penpot profile → Access Tokens after first login. The existing `postinstall.sh` symlink mechanism makes it available in all packages automatically.

---

## Phase 3: Token Bridge (`packages/theme/`)

### New file: `packages/theme/scripts/export-penpot.ts`

Reads OKLCH token definitions and emits a W3C Design Tokens Community Group (DTCG) compatible JSON file.

**Input sources:**
- `src/primitives/colors.oklch.ts` — primitive palettes (teal, neutral, destructive)
- `src/tokens/semantic.ts` — semantic mappings (light + dark)
- `src/primitives/typography.ts` — type scale

**Conversion:** Uses existing `src/utils/oklch-to-hex.ts` — no new dependencies.

**Output:** `design/tokens/tokens.json`

```json
{
  "color": {
    "primary": {
      "600": { "$value": "#4da0a0", "$type": "color" }
    },
    "neutral": {
      "50": { "$value": "#fbfbfb", "$type": "color" }
    },
    "destructive": {
      "500": { "$value": "#c0392b", "$type": "color" }
    }
  },
  "semantic": {
    "light": {
      "background": { "$value": "#ffffff", "$type": "color" },
      "primary":    { "$value": "#4da0a0", "$type": "color" }
    },
    "dark": {
      "background": { "$value": "#0d0d0d", "$type": "color" },
      "primary":    { "$value": "#5ab5b5", "$type": "color" }
    }
  }
}
```

### New script in `packages/theme/package.json`

```json
"export:penpot": "tsx scripts/export-penpot.ts"
```

Run via: `pnpm --filter @trainers/theme export:penpot`

---

## Phase 4: Design Directory (`design/`)

Top-level `design/` directory committed to the monorepo.

```
design/
├── README.md
├── tokens/
│   └── tokens.json       # Generated — commit alongside theme changes
├── exports/
│   └── .gitkeep          # SVG/PNG assets exported from Penpot
└── backups/
    └── .gitkeep          # .penpot project backup files
```

### Sync workflow

1. Change a token in `packages/theme/src/`
2. Run `pnpm --filter @trainers/theme export:penpot`
3. Commit both the TS change and `design/tokens/tokens.json` together
4. In Penpot: Assets → Design Tokens → Import → select `design/tokens/tokens.json`

### Backup workflow

After significant design milestones: Penpot → File → Export → save `.penpot` file to `design/backups/`.

---

## Out of Scope

- Automated Penpot → code generation (future)
- CI token sync (future — manual workflow for now)
- Mobile (Tamagui) token export (future)
