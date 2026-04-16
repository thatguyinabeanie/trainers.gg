# CI Action Extraction & Caching Optimization

**Date:** 2026-04-10
**Status:** Approved

## Problem

`ci.yml` is 746 lines with ~200 lines of inline bash in the `deploy-preview` job (Supabase branch management, Vercel env var injection, deployment polling with redeployment fallback, branch DB readiness checks). This makes the workflow hard to read and modify.

## Solution

Extract verbose inline scripts into composite actions under `.github/actions/`. Keep `ci.yml` as a single workflow file — the orchestrator — with clean action calls instead of inline bash. No sharding or structural changes to job layout.

## Actions to Create

### 1. `supabase-branch`

Creates or finds a Supabase preview branch matching the git branch name. Polls until credentials are available, extracts project ref from connection URL, and masks all sensitive values.

**Location:** `.github/actions/supabase-branch/action.yml`

| Field | Value |
|---|---|
| Inputs | `access-token` (required), `project-ref` (required), `git-branch` (required) |
| Outputs | `ref` — the branch's Supabase project ref |
| Source | "Setup Supabase CLI" + "Create or find Supabase branch" steps from `deploy-preview` |

Key behavior:
- Installs Supabase CLI (`supabase/setup-cli@v1` with `version: latest`)
- Checks if branch exists via `supabase --experimental branches list`
- Creates branch if missing via `supabase --experimental branches create`
- Polls `supabase --experimental branches get` until `POSTGRES_URL_NON_POOLING` is present (up to 5 min)
- Extracts project ref from `db.<ref>.supabase.co` in the non-pooling URL
- Masks all sensitive values (`POSTGRES_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, etc.) via `::add-mask::`

### 2. `inject-preview-env`

Retrieves branch credentials and upserts them as git-branch-scoped Preview environment variables in Vercel via REST API. These override the Supabase integration's All Environments vars for this specific branch.

**Location:** `.github/actions/inject-preview-env/action.yml`

| Field | Value |
|---|---|
| Inputs | `branch-ref` (required), `git-branch` (required), `supabase-access-token` (required), `supabase-project-ref` (required), `vercel-token` (required), `vercel-team-id` (required), `vercel-project-id` (required) |
| Outputs | none |
| Source | "Inject env vars into Vercel" step from `deploy-preview` |

Key behavior:
- Calls `supabase --experimental branches get` to retrieve credentials
- Extracts `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from response
- Parses `POSTGRES_PASSWORD` from `POSTGRES_URL` connection string (`postgresql://user:PASSWORD@host:port/db`)
- Parses `POSTGRES_HOST` from `POSTGRES_URL_NON_POOLING`
- Masks all credentials via `::add-mask::`
- Logs extraction diagnostics (value lengths, not values)
- Fails the step if password extraction fails
- Upserts 8 env vars via `POST /v10/projects/{id}/env?upsert=true`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_HOST`
- All vars scoped to `target: ["preview"]` with `gitBranch` matching the PR branch
- Uses `jq -n` to safely construct JSON (prevents shell injection in env var values)

### 3. `wait-for-preview`

Polls the Vercel REST API for a preview deployment matching the PR commit SHA. Handles the race condition where the first build fails (missing env vars) by detecting ERROR state and triggering a redeployment via the Vercel API.

**Location:** `.github/actions/wait-for-preview/action.yml`

| Field | Value |
|---|---|
| Inputs | `vercel-token` (required), `vercel-team-id` (required), `vercel-project-id` (required), `bypass-secret` (required), `pr-sha` (required), `git-branch` (required), `github-token` (required) |
| Outputs | `url` — the preview deployment URL (https://...) |
| Source | "Wait for Vercel preview deployment" step from `deploy-preview` |

Key behavior:
- Polls `GET /v6/deployments?sha={sha}&limit=5` every 15s (up to 50 attempts / ~12 min)
- On `READY`: verifies HTTP accessibility via bypass header, outputs URL
- On `ERROR` (first occurrence only): triggers redeployment via `POST /v13/deployments` with git source, sets `REDEPLOYED=true` to prevent loops, continues polling for the new deployment
- Captures curl stderr to temp file and logs on failure (no `2>/dev/null`)
- Times out with `::error::` if no READY deployment within the polling window

### 4. `check-branch-db`

Lightweight check against the preview's `/api/e2e/seed` GET endpoint to verify the deployment is connected to a Supabase branch DB (not production).

**Location:** `.github/actions/check-branch-db/action.yml`

| Field | Value |
|---|---|
| Inputs | `preview-url` (required), `bypass-secret` (required) |
| Outputs | `ready` — `"true"` or `"false"` |
| Source | "Check Supabase branch DB readiness" step from `deploy-preview` |

Key behavior:
- Calls `GET {preview-url}/api/e2e/seed` with bypass header
- Parses `{ safe: true/false, reason? }` response
- Outputs `ready=true` if safe, `ready=false` otherwise
- Logs curl errors visibly (no suppression)

## Changes to ci.yml

The `deploy-preview` job replaces ~200 lines of inline bash with 4 action calls (~40 lines). All other jobs remain unchanged.

The job needs `actions/checkout` added as the first step so composite actions can be referenced via `./.github/actions/`.

## Caching

No major caching changes. The current setup is already solid:
- Turbo remote cache configured via `setup` action
- ESLint/TypeScript/Jest local caches with appropriate keys
- Playwright browser cache with `fail-on-cache-miss`
- `node_modules` shared via `install` job

Minor improvement: the `setup` action already handles Turbo cache configuration. The per-job ESLint/TypeScript/Jest caches could be simplified but this is low priority and can be done separately.

## Verification

1. Push changes, verify CI passes all jobs
2. The `deploy-preview` job should work identically — same behavior, just organized into actions
3. E2E tests should run against the branch DB preview
4. `pr-cleanup.yml` remains unchanged (it already uses its own inline scripts which are short enough)
