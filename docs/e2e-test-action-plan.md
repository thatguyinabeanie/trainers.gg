# E2E Test Infrastructure - Action Plan (TGG-231)

**Status:** ⚠️ Ready for Verification
**Date:** 2026-02-05
**Ticket:** TGG-231 - Fix E2E test infrastructure

---

## Current Status Summary

### ✅ What's Already Working

1. **E2E test infrastructure is fully configured**
   - Playwright installed and configured (`apps/web/playwright.config.ts`)
   - 8 test files covering auth, navigation, dashboard, organizations, tournaments
   - Two-project auth pattern (setup + chromium)
   - Sharded execution (2 shards) for parallel testing

2. **Hybrid auth strategy implemented**
   - Mock auth (`injectE2EMockAuth()`) for UI/navigation tests
   - Real auth (`loginViaUI()`) for auth flow tests
   - E2E bypass in proxy for CI environments

3. **CI workflow configured**
   - Waits for Vercel preview deployments
   - Runs E2E tests against preview URLs
   - Provides bypass secrets for fast test execution
   - Uploads reports and traces on failure

### ⚠️ Why Tests Appear "Skipped"

**Tests are skipping by design, not due to a failure.**

From `.github/workflows/ci.yml`:

```yaml
wait-for-preview:
  if: github.event_name == 'pull_request' # ← Only runs on PRs

e2e-tests:
  if: github.event_name == 'pull_request' # ← Only runs on PRs
  needs: [wait-for-preview]
```

**Conclusion:** E2E tests only run on pull requests. Recent CI run was a push to `main`, so tests were correctly skipped.

---

## Verification Steps

### Step 1: Create Test Pull Request

**Purpose:** Verify E2E tests run in CI

**Commands:**

```bash
cd /Users/beanie/source/trainers.gg

# Create feature branch
git checkout -b test/verify-e2e-tests-tgg-231

# Make trivial change
echo "# E2E Test Verification (TGG-231)" >> docs/.verification-test.md
git add docs/.verification-test.md

# Commit
git commit -m "test: verify E2E tests run in CI (TGG-231)

This PR verifies that E2E test infrastructure is working correctly.

- Tests should run against Vercel preview deployment
- E2E auth bypass should allow tests to pass without database
- All 8 test files should execute successfully

Related: TGG-231"

# Push
git push -u origin test/verify-e2e-tests-tgg-231
```

**Then:**

1. Open pull request on GitHub
2. Monitor CI workflow (should take ~12-15 minutes)
3. Verify all E2E test jobs complete successfully

**Expected CI job sequence:**

| Job                  | Expected Status | Duration | Notes                                  |
| -------------------- | --------------- | -------- | -------------------------------------- |
| Install Dependencies | ✅ success      | ~30s     | Caches node_modules                    |
| Unit Tests           | ✅ success      | ~5m      | Should already be passing              |
| Lint & Typecheck     | ✅ success      | ~8m      | Should already be passing              |
| Wait for Preview     | ✅ success      | ~10m     | **Previously skipped, now should run** |
| E2E Tests (Shard 1)  | ✅ success      | ~3m      | **Previously skipped, now should run** |
| E2E Tests (Shard 2)  | ✅ success      | ~3m      | **Previously skipped, now should run** |
| E2E Test Results     | ✅ success      | ~10s     | **Previously skipped, now should run** |
| Lighthouse           | ✅ success      | ~2m      | Performance audit                      |

### Step 2: Run Tests Locally (Optional)

**Purpose:** Verify tests work in local environment

**Prerequisites:**

```bash
# Install Playwright browsers (if not already installed)
pnpm --filter=@trainers/web exec playwright install chromium

# Make verification script executable
chmod +x scripts/verify-e2e-tests.sh
```

**Option A: Against local dev server**

```bash
# Terminal 1: Start dev server
pnpm dev:web+backend

# Terminal 2: Run verification script
./scripts/verify-e2e-tests.sh --local

# OR run Playwright directly
export PLAYWRIGHT_BASE_URL="http://localhost:3000"
pnpm --filter=@trainers/web exec playwright test
```

**Option B: Check configuration only**

```bash
./scripts/verify-e2e-tests.sh --check-only
```

**Expected output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  E2E Test Infrastructure Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/6] Checking Playwright installation...
  ✓ Playwright installed: Version X.X.X

[2/6] Checking Playwright browsers...
  ✓ Playwright browsers installed

[3/6] Checking E2E test files...
  ✓ Found 8 E2E test files

[4/6] Checking auth fixtures...
  ✓ Auth fixtures present

[5/6] Checking proxy E2E bypass...
  ✓ Proxy has E2E bypass support

[6/6] Checking Supabase configuration...
  ✓ NEXT_PUBLIC_SUPABASE_URL is set
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Verify Vercel Secrets (Required)

**Purpose:** Ensure CI has access to bypass secrets

**Check GitHub Actions secrets:**

1. Go to: https://github.com/thatguyinabeanie/trainers.gg/settings/secrets/actions
2. Verify these secrets exist:
   - `VERCEL_AUTOMATION_BYPASS_SECRET`
   - `E2E_AUTH_BYPASS_SECRET`

**If missing, add them:**

```bash
# Generate secure random strings
openssl rand -base64 32  # Use this for VERCEL_AUTOMATION_BYPASS_SECRET
openssl rand -base64 32  # Use this for E2E_AUTH_BYPASS_SECRET
```

Then add as GitHub repository secrets.

**Also add to Vercel:**

1. Go to: Vercel dashboard → Project Settings → Environment Variables
2. Add both secrets for "Preview" environment

---

## Success Criteria (TGG-231)

| Criterion                                           | Status     | Verification Method                  |
| --------------------------------------------------- | ---------- | ------------------------------------ |
| ✅ E2E tests run in GitHub Actions CI (not skipped) | ⚠️ Pending | Create PR, monitor CI (Step 1)       |
| ✅ Preview deployments use preview credentials      | ⚠️ Unknown | Optional (using E2E bypass instead)  |
| ✅ Test users accessible in preview environments    | ✅ Yes     | Using mock auth (no database needed) |
| ✅ All E2E tests pass                               | ⚠️ Pending | Verify in PR CI run (Step 1)         |

---

## If Tests Fail in CI

### Scenario 1: wait-for-preview times out

**Symptoms:**

- Job waits for 10+ minutes
- Error: "Timeout waiting for Vercel preview deployment"

**Possible causes:**

1. Vercel deployment failed
2. Vercel integration not configured
3. GitHub deployment API not returning preview URL

**Solution:**

1. Check Vercel dashboard for deployment status
2. Check Vercel integration settings (should be enabled for GitHub repo)
3. Manually trigger Vercel deployment if needed

### Scenario 2: E2E tests fail with auth errors

**Symptoms:**

- Tests redirect to `/sign-in`
- Error: "Login failed for player@trainers.local"
- Tests timeout waiting for navigation

**Possible causes:**

1. `E2E_AUTH_BYPASS_SECRET` not set in CI
2. Proxy not detecting bypass header
3. Preview deployment not using correct env vars

**Solution:**

1. Verify `E2E_AUTH_BYPASS_SECRET` exists in GitHub Actions secrets
2. Check CI logs for "E2E_AUTH_BYPASS_SECRET: SET" message in auth setup
3. Verify preview deployment has correct `NEXT_PUBLIC_SUPABASE_URL`

### Scenario 3: E2E tests fail with "Cannot find module"

**Symptoms:**

- Import errors in test files
- Module resolution failures

**Possible causes:**

1. Missing dependencies in CI
2. Playwright cache miss
3. Incorrect workspace setup

**Solution:**

1. Check "Install Dependencies" job completed successfully
2. Check "Restore workspace links" step in e2e-tests job
3. Clear CI cache and retry

### Scenario 4: E2E tests fail with browser errors

**Symptoms:**

- "Browser not installed"
- "Browser process exited"

**Possible causes:**

1. Playwright browsers not cached
2. Chromium dependencies missing
3. CI runner out of resources

**Solution:**

1. Check "Cache Playwright browsers" step hit/miss
2. Check "Install Playwright browsers" step completed
3. Retry job (may be transient CI issue)

---

## Optional: Enable Supabase Preview Branches

**Current approach:** E2E auth bypass (fast, no database needed)

**Alternative:** Supabase preview branches (full E2E validation)

### When to Use Preview Branches

Use preview branches if you need to:

- Test real database queries
- Test RLS policies
- Test complex auth flows
- Test data integrity across features

### How to Enable

1. **Install Supabase Vercel Integration:**
   - Go to: https://vercel.com/integrations/supabase
   - Click "Add Integration"
   - Select `trainers-gg` project

2. **Verify preview branches are created:**

   ```bash
   pnpm supabase branches list
   ```

3. **Seed preview branches with test users:**

   ```bash
   ./scripts/seed-preview-branch.sh <branch-name>
   ```

4. **Update CI to use real auth:**
   - Remove `E2E_AUTH_BYPASS_SECRET` from CI environment
   - Tests will fall back to real UI login
   - Requires test users in preview database

### Tradeoffs

| Aspect         | E2E Bypass (Current)        | Preview Branches (Optional)  |
| -------------- | --------------------------- | ---------------------------- |
| Speed          | ⚡ Fast (~3 min per shard)  | 🐢 Slower (~5 min per shard) |
| Database setup | ✅ None needed              | ⚠️ Requires seeding          |
| Test coverage  | ⚠️ UI/navigation only       | ✅ Full E2E with database    |
| Maintenance    | ✅ No database to maintain  | ⚠️ Keep seeds updated        |
| CI reliability | ✅ No external dependencies | ⚠️ Depends on Supabase API   |

**Recommendation:** Keep E2E bypass for fast feedback, add preview branch tests for pre-production validation.

---

## Post-Verification Steps

### If Tests Pass

1. ✅ Close verification PR (or merge if you want to keep `.verification-test.md`)
2. ✅ Update Linear ticket (TGG-231) to "Done"
3. ✅ Document findings in team meeting/standup
4. ✅ Consider adding E2E test documentation to `CLAUDE.md`

### If Tests Fail

1. ⚠️ Capture failure details:
   - CI job logs
   - Playwright traces (automatically uploaded)
   - Screenshots (automatically uploaded)
2. ⚠️ Review failure scenarios above
3. ⚠️ Update Linear ticket with findings
4. ⚠️ Fix issues and re-run verification

### Update Documentation

**Add to `CLAUDE.md`:**

```markdown
## E2E Testing

- Tests only run on pull requests (not main branch pushes)
- Uses hybrid auth: mock for UI tests, real for auth flow tests
- CI uses E2E auth bypass for fast execution (no database needed)
- Run locally: `pnpm --filter=@trainers/web exec playwright test`
- Verification script: `./scripts/verify-e2e-tests.sh`
```

---

## Key Files Reference

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `.github/workflows/ci.yml`             | CI workflow (lines 237-427 for E2E)         |
| `apps/web/playwright.config.ts`        | Playwright configuration                    |
| `apps/web/e2e/tests/*.spec.ts`         | E2E test files (8 total)                    |
| `apps/web/e2e/tests/auth.setup.ts`     | Global auth setup                           |
| `apps/web/e2e/fixtures/auth.ts`        | Real auth helpers                           |
| `apps/web/e2e/fixtures/auth-bypass.ts` | Mock auth helpers                           |
| `apps/web/src/proxy.ts`                | E2E bypass implementation (lines 123-158)   |
| `scripts/verify-e2e-tests.sh`          | Infrastructure verification script          |
| `scripts/seed-preview-branch.sh`       | Preview branch seeding (if using real auth) |
| `docs/e2e-test-integration-report.md`  | Detailed analysis report                    |
| `docs/vercel-supabase-integration.md`  | Supabase preview branch documentation       |

---

## Quick Commands

```bash
# Verify E2E infrastructure
./scripts/verify-e2e-tests.sh --check-only

# Run tests locally
pnpm dev:web+backend  # Terminal 1
pnpm --filter=@trainers/web exec playwright test  # Terminal 2

# Run specific test file
pnpm --filter=@trainers/web exec playwright test auth/sign-in.spec.ts

# Run tests in UI mode (debug)
pnpm --filter=@trainers/web exec playwright test --ui

# View last test report
pnpm --filter=@trainers/web exec playwright show-report

# Create verification PR
git checkout -b test/verify-e2e-tests-tgg-231
echo "# E2E Test Verification" >> docs/.verification-test.md
git add docs/.verification-test.md
git commit -m "test: verify E2E tests run in CI (TGG-231)"
git push -u origin test/verify-e2e-tests-tgg-231
# Then open PR on GitHub
```

---

## Timeline Estimate

| Task                   | Duration    | Notes                            |
| ---------------------- | ----------- | -------------------------------- |
| Create verification PR | 2 min       | Branch, commit, push, open PR    |
| Wait for CI to run     | 12-15 min   | Vercel deployment + E2E tests    |
| Review results         | 5 min       | Check logs, reports, screenshots |
| Update documentation   | 5 min       | Update CLAUDE.md if needed       |
| Close ticket           | 2 min       | Update Linear with findings      |
| **Total**              | **~30 min** | Assuming tests pass on first run |

---

## Contact & Support

**Documentation:**

- Detailed analysis: `docs/e2e-test-integration-report.md`
- Supabase integration: `docs/vercel-supabase-integration.md`
- This action plan: `docs/e2e-test-action-plan.md`

**Key findings:**

- E2E tests are **working as designed** (PR-only by design)
- Infrastructure is **correctly configured**
- Tests use **hybrid auth strategy** (mock + real)
- Verification needed: **Create test PR to confirm**
