---
name: diagnosing-ci
description: Use when a CI check fails after a push — covers mapping check names to workflows, fetching the right logs, and telling flakes from real failures
---

# Diagnosing CI

Map a failing check name to the right workflow, fetch targeted logs, and triage flake vs. real failure.

## CI Check Inventory

| Check name (GitHub UI)          | Workflow file           | What it runs                                               |
| ------------------------------- | ----------------------- | ---------------------------------------------------------- |
| Install Dependencies            | `ci.yml`                | `pnpm install --frozen-lockfile`                           |
| Lint & Typecheck                | `ci.yml`                | `pnpm turbo run lint` + `pnpm turbo run typecheck`         |
| Test @trainers/web              | `ci.yml`                | `pnpm turbo run test --filter=@trainers/web`               |
| Test @trainers/mobile           | `ci.yml`                | `pnpm turbo run test --filter=@trainers/mobile`            |
| Test packages                   | `ci.yml`                | `pnpm turbo run test --filter='./packages/*'`              |
| Upload Coverage                 | `ci.yml`                | Aggregates lcov from all test jobs → Codecov               |
| E2E Prepare (browsers)          | `ci.yml`                | Installs/caches Playwright browsers (PR-only)              |
| Wait for Preview                | `ci.yml`                | Creates Supabase branch, injects env, waits for Vercel URL |
| E2E Tests                       | `ci.yml`                | `playwright test` against Vercel preview (PR-only)         |
| Lighthouse                      | `ci.yml`                | Lighthouse CI against preview URL (PR-only)                |
| Analyze Bundle                  | `bundle-analysis.yml`   | Next.js bundle size analysis (web/packages changes only)   |
| Analyze (javascript-typescript) | `codeql.yml`            | GitHub CodeQL security scan                                |
| Vercel — Preview                | Vercel (not a workflow) | Next.js preview build + deploy                             |
| codecov/patch                   | Codecov (external)      | Coverage on changed lines (60% minimum; aim for 80%+)      |

Other workflows (no check status on PRs): `deploy-pds.yml` (PDS deploy on main push), `pr-cleanup.yml` (deletes Supabase branch on PR close), `claude.yml` (Claude Code automation).

## Fetching Logs

```bash
# See all checks for the current branch
gh pr checks <branch>

# Show the full log of a failed run
gh run view <run-id> --log-failed

# Open the run in the browser for the HTML report
gh run view <run-id> --web

# List recent runs for a specific workflow
gh run list --workflow=ci.yml --limit=5

# Download Playwright HTML report artifact after E2E failure
gh run download <run-id> --name playwright-report
```

For E2E failures, the `playwright-report` artifact (uploaded for 7 days) is the most useful: it has screenshots, traces, and per-test timelines. Traces are only uploaded on failure (`playwright-traces` artifact).

## How E2E Tests Are Triggered

E2E tests run **only on PRs, never on pushes to main**. The `e2e-tests` job has two gates:

1. The PR author is not Dependabot
2. `deploy-preview` outputs `branch-db-ready == 'true'` — the Supabase branch DB was successfully provisioned

If the `Wait for Preview` job times out or the branch DB isn't ready, E2E is silently skipped (not failed).

The seed step (`POST /api/e2e/seed`) runs in CI before Playwright. A `404` response aborts — it signals the preview is connected to the production database. `auth.setup.ts` also calls the seed endpoint as a fallback.

## Codecov / Patch Coverage

Codecov checks patch coverage on changed lines. The project minimum is 60%; aim for 80%+ on new code.

- A "codecov/patch" failure means the PR's new/changed lines are under-covered
- Fix by adding tests for the uncovered new code — do not reduce coverage thresholds
- If a file is legitimately untestable (generated code, config), add it to `.codecov.yml`'s `ignore` list (check if that file exists first)

### Find the gap from the CI artifact — don't re-run coverage locally

CI already computed coverage on the exact pushed commit. **Pull its `lcov.info` artifact instead of running `jest --coverage` locally** — it's faster, matches what Codecov measured, and avoids a slow local instrumentation pass just to find which lines are missing.

```bash
# 1. Find the run for the commit, then its artifacts (look for coverage-web / coverage-packages / coverage-mobile)
RID=$(gh run list --workflow=ci.yml --branch="$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')
gh api repos/{owner}/{repo}/actions/runs/$RID/artifacts | jq -r '.artifacts[].name'

# 2. Download the lcov (coverage-web lives at apps/web/coverage/lcov.info)
gh run download "$RID" --name coverage-web --dir /tmp/cov-web

# 3. Rank changed production files by uncovered (hits=0) lines
git diff --name-only origin/main...HEAD -- 'apps/web/src/**/*.ts' 'apps/web/src/**/*.tsx' \
  | grep -vE "__tests__|\.test\." | sed 's#apps/web/##' > /tmp/changed-prod.txt
awk '/^SF:/{f=$0;sub(/^SF:/,"",f);m=0;t=0} /^DA:/{split($0,a,",");t++;if(a[2]+0==0)m++} /^end_of_record/{print m"\t"t"\t"f}' \
  /tmp/cov-web/apps/web/coverage/lcov.info \
  | while IFS=$'\t' read -r m t f; do s=$(echo "$f"|grep -oE "src/.*"); grep -qxF "$s" /tmp/changed-prod.txt && [ "$m" -gt 0 ] && echo "$m missing / $t  $s"; done \
  | sort -rn
```

Caveat: lcov's per-file miss count is **whole-file** (an upper bound) — `codecov/patch` only counts the _changed_ subset of those lines. For exact patch lines, intersect the `hits=0` line numbers with the file's `git diff` added-line ranges. For prioritizing which files to test, the whole-file ranking is enough — start with the biggest, and the 0%-covered new files (small, high-yield).

## Submodule Gotcha

Every `actions/checkout` step in CI uses `submodules: recursive` to check out `vendor/damage-calc`. If you see a build error like `Cannot find module '@smogon/calc'`, the submodule was not initialized. This is a CI configuration issue — never work around it by changing the `@smogon/calc` dependency to a git tarball. See the root `CLAUDE.md` for the full constraint.

## Supabase Branch Lifecycle

- Created by `.github/actions/supabase-branch` in the `deploy-preview` job
- Migrations are applied automatically on branch creation
- Deleted by `pr-cleanup.yml` when the PR is closed
- The `check-branch-db` action polls the preview app's `/api/health` or similar to confirm the branch DB is accepting connections before E2E starts

## Flake vs. Real Failure Triage

| Symptom                                          | Likely cause                                              | Action                                                  |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| E2E fails on `auth.setup.ts` login retry loop    | Supabase branch still seeding                             | Re-run the E2E job (flake; seed timing)                 |
| E2E fails only in CI, passes locally             | `workers: 1` in CI vs 2 locally, or preview-specific data | Check the trace artifact; look for timing/ordering deps |
| Lint fails on unrelated lines                    | Auto-import added by another agent                        | Check `git diff` carefully before fixing                |
| TypeScript error on generated `types.ts`         | `pnpm generate-types` not run after migration             | Run `pnpm generate-types` and commit the updated file   |
| `Install Dependencies` fails with lockfile error | `pnpm-lock.yaml` not updated                              | Run `pnpm install` locally and commit the updated lock  |
| Codecov/patch below threshold                    | New code lacking tests                                    | Add unit tests for uncovered lines                      |
| `Wait for Preview` times out                     | Vercel deploy slow / queued                               | Re-run the workflow; if persistent, check Vercel status |
| E2E seed returns 404                             | Preview connected to production DB                        | Investigate Supabase branch setup; do not re-run        |

**Rerun guidance:** Use `gh run rerun <run-id> --failed` for one-time timing flakes. If the same check fails twice on identical code, it is a real failure — diagnose before re-running again.

## Related Skills

See `reviewing-pr` for the full PR review checklist and `reviewing-pr-feedback` for resolving CI failures in the context of an open review loop.
