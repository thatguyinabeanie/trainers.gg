---
name: reviewing-pr
description: Use when reviewing a PR, running /review-pr, or after creating a PR — runs project-specific review checks beyond generic code quality, monitors CI, fetches and addresses review comments, and checks for caching opportunities
---

# Reviewing PR

Comprehensive PR review workflow that extends `/pr-review-toolkit:review-pr` with trainers.gg-specific checks, CI monitoring, comment handling, and caching analysis.

## When to Use

- After creating a PR
- When asked to review a PR
- When `/review-pr` is invoked
- When CI checks fail or review comments appear

## The Full Workflow

### Phase 1: Generic Code Quality Review

Invoke `/pr-review-toolkit:review-pr all parallel` to run the standard review agents (code, tests, errors, types, simplify). Wait for results.

### Phase 2: Project-Specific Checks

Run these checks against the diff (`git diff main...HEAD`). Each check is independent — dispatch as parallel subagents when possible.

#### 2a. Database & RLS Check

For any changes touching `packages/supabase/supabase/migrations/`:

- [ ] New tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] New tables have SELECT, INSERT, UPDATE, DELETE policies (or explicit comments explaining why not)
- [ ] SELECT policies use `(SELECT auth.uid())` initplan pattern (not bare `auth.uid()`)
- [ ] No `USING(true)` unless intentional with a comment explaining why
- [ ] `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
- [ ] `IF NOT EXISTS` / `IF EXISTS` guards on all DDL
- [ ] Foreign keys have explicit `ON DELETE` behavior (not implicit RESTRICT without comment)
- [ ] Columns that should be `NOT NULL` are marked as such
- [ ] Migration reviewer agent: invoke `migration-reviewer` agent

#### 2b. Cache Invalidation Check

For any changes touching `apps/web/src/actions/`:

- [ ] Every mutation that changes data calls `updateTag(CacheTags.xxx)` for affected caches
- [ ] Social links, name, description, logo changes → `CacheTags.COMMUNITIES_LIST`
- [ ] Tournament CRUD → `CacheTags.TOURNAMENTS_LIST` + `CacheTags.tournament(slug)`
- [ ] Community changes → `CacheTags.community(slug)` + `CacheTags.community(id)`
- [ ] Player profile changes → `CacheTags.player(handle)`

#### 2c. Next.js Caching Opportunities

For any new Server Component pages or data-fetching patterns:

- [ ] **Public data** (same for all users) should use `unstable_cache` + `createStaticClient()` + cache tags
- [ ] **Authenticated but community-level data** (same for all viewers of a community) can still use `unstable_cache` with `createStaticClient()` — access checks happen separately
- [ ] **User-specific data** (my alts, my settings) should NOT be cached with `unstable_cache`
- [ ] Pages with `unstable_cache` should set `export const revalidate = false` (on-demand only)
- [ ] Cache keys include the entity ID to prevent cross-entity cache collisions
- [ ] No `createClient()` (authenticated) inside `unstable_cache` — use `createStaticClient()` instead

#### 2d. TanStack Query Caching Opportunities

For any new client components that fetch data:

- [ ] `useSupabaseQuery` calls have appropriate `staleTime` (default is 0 — consider if data changes frequently)
- [ ] Related queries share a common query key prefix for bulk invalidation
- [ ] Mutations call `queryClient.invalidateQueries` for affected query keys
- [ ] Optimistic updates used where appropriate (drag-drop, toggles, inline edits)
- [ ] No duplicate fetching — check if the same data is already fetched by a parent Server Component and passed as props

#### 2e. Query Efficiency & Indexing Check

For any changes touching `packages/supabase/src/queries/` or `packages/supabase/src/mutations/`:

- [ ] **N+1 queries**: Look for loops that make a DB call per iteration — refactor to batch `IN` queries or joins
- [ ] **Unbounded fetches**: Any `select("*")` or `select(columns)` without `.limit()` that could grow — add limits or push aggregation to SQL (RPC, views)
- [ ] **Missing indexes**: New columns used in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY` clauses should have indexes. Check the migration for corresponding `CREATE INDEX`
- [ ] **Foreign key indexes**: New FK columns should have indexes — Postgres doesn't auto-index FKs, and missing indexes cause slow CASCADE deletes and join performance issues
- [ ] **Composite index opportunities**: Queries filtering on multiple columns (e.g., `WHERE community_id = X AND status = Y`) benefit from composite indexes
- [ ] **Sequential queries that could be parallel**: Independent Supabase queries should use `Promise.all`, not sequential `await`
- [ ] **Full table scans**: Queries without a `WHERE` clause on an indexed column — consider whether the query needs the full table or can be scoped

#### 2f. Mobile Parity Check

For any changes to `apps/web/`:

- [ ] Check if equivalent mobile feature exists or needs a ticket
- [ ] Invoke `checking-mobile-parity` skill if new user-facing features were added

#### 2f. Security Review

For changes touching auth, RLS, or sensitive data:

- [ ] Invoke `security-reviewer` agent
- [ ] Team sheet data: only OTS fields in public snapshots, no EVs/IVs/nature leaking
- [ ] Service role client usage is justified and not exposed to client bundles
- [ ] No secrets in client-accessible code

### Phase 3: CI Monitoring

After all reviews complete and fixes are pushed:

1. Run `gh pr checks <pr-number>` — wait for all checks to complete
2. Fix any CI failures (lint, typecheck, test, E2E)
3. Re-push and re-check until green

### Phase 4: Fetch & Address Review Comments

After CI is green:

1. **Fetch all comments**: `gh api /repos/{owner}/{repo}/pulls/{pr}/comments`
2. **Identify unreplied**: filter out comments that already have replies
3. **Group similar comments** — batch related issues into single decisions
4. **For each group**, present to user with:
   - The comment text and file/line context
   - Whether it's a valid concern, false positive, or style preference
   - Recommended action (fix, acknowledge, or dismiss)
5. **After all reviewed**, fix approved items (parallel subagents for independent fixes)
6. **Reply to every comment** on the PR:
   - Fixed: "Fixed in {sha} — {summary}"
   - Acknowledged: "Acknowledged — {reason}"
   - Dismissed: "Dismissed — {reason}"

### Phase 5: Final Verification

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] All CI checks green
- [ ] All review comments addressed with replies
- [ ] No untracked files accidentally committed

## Commands Reference

```bash
# Check CI status
gh pr checks <pr-number>

# Get failed check logs
gh run view <run-id> --log-failed

# Fetch review comments
gh api /repos/{owner}/{repo}/pulls/{pr}/comments \
  --jq '.[] | {id, user: .user.login, path, line, body}'

# Reply to a comment
gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="Fixed in {sha} — {what changed}"

# Get unreplied comments
gh api /repos/{owner}/{repo}/pulls/{pr}/comments \
  --jq '[.[] | select(.in_reply_to_id == null)] | map(.id)' > /tmp/all-ids.json
gh api /repos/{owner}/{repo}/pulls/{pr}/comments \
  --jq '[.[] | select(.in_reply_to_id != null) | .in_reply_to_id] | unique' > /tmp/replied-ids.json
```

## Caching Decision Tree

```
Is the data the same for ALL users viewing this page?
├── YES (public/community-level data)
│   └── Use unstable_cache + createStaticClient() + CacheTags
│       Example: community stats, tournament list, player profiles
├── PARTIALLY (public data + user-specific overlay)
│   └── Cache the public part, fetch the user part separately
│       Example: tournament page (cached) + "am I registered?" (auth query)
└── NO (user-specific data)
    └── Do NOT cache with unstable_cache
        Use createClient() or createClientReadOnly()
        Example: my alts, my settings, my notifications
```

## TanStack Query Stale Time Guidelines

| Data Type                 | Recommended staleTime | Reasoning                                     |
| ------------------------- | --------------------- | --------------------------------------------- |
| Static reference data     | `Infinity`            | Formats, countries, types — never changes     |
| Community/tournament data | `30_000` (30s)        | Changes infrequently, OK to be slightly stale |
| Live tournament state     | `0` (default)         | Matches, rounds change rapidly                |
| User profile data         | `60_000` (1m)         | Changes rarely                                |
| Notification counts       | `10_000` (10s)        | Should feel responsive                        |
