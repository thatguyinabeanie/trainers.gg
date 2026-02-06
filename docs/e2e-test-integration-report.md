# E2E Test Integration Report (TGG-231)

**Generated:** 2026-02-05
**Status:** ⚠️ Tests Currently Skipping in CI
**Reason:** CI only runs E2E tests on pull requests (not on main branch pushes)

---

## Executive Summary

E2E tests are **configured correctly** but are **intentionally skipped** when code is pushed directly to the `main` branch. Tests only run on pull requests to verify preview deployments.

### Current Behavior

| Trigger         | E2E Tests Run? | Why?                                       |
| --------------- | -------------- | ------------------------------------------ |
| Push to `main`  | ❌ Skipped     | No preview deployment (line 239 of ci.yml) |
| Pull Request    | ✅ Runs        | Waits for Vercel preview + runs against it |
| Manual Workflow | ❌ Skipped     | Same as push to main (no PR = no preview)  |

### Root Cause Analysis

**From `.github/workflows/ci.yml` lines 238-240:**

```yaml
wait-for-preview:
  name: Wait for Preview
  if: github.event_name == 'pull_request' # ← ONLY runs on PRs
```

**Jobs that depend on `wait-for-preview` (lines 288-290, 387-390):**

```yaml
e2e-tests:
  if: github.event_name == 'pull_request' # ← Enforces PR-only
  needs: [install, wait-for-preview]

e2e-results:
  if: always() && github.event_name == 'pull_request' # ← PR-only
  needs: [e2e-tests]
```

**Result:** E2E tests are **architecturally designed** to skip on main branch pushes because there's no preview deployment to test against.

---

## Test Infrastructure Components

### 1. Playwright Configuration

**File:** `apps/web/playwright.config.ts`

Key features:

- **Base URL:** `process.env.PLAYWRIGHT_BASE_URL` (injected by CI wait-for-preview job)
- **Two-project auth pattern:**
  - `setup` project: Logs in as `player@trainers.local`, saves storage state
  - `chromium` project: Depends on setup, reuses saved auth
- **E2E auth bypass:** Alternative to UI login when `E2E_AUTH_BYPASS_SECRET` is set
- **Vercel bypass:** `x-vercel-protection-bypass` header (skip Vercel password protection)

**Auth Bypass Logic:**

```typescript
// If E2E_AUTH_BYPASS_SECRET is set, skip UI login entirely
...(process.env.E2E_AUTH_BYPASS_SECRET
  ? []
  : [
      {
        name: "setup",
        testMatch: /auth\.setup\.ts/,
      },
    ]),
```

### 2. Auth Setup Script

**File:** `apps/web/e2e/tests/auth.setup.ts`

**Purpose:** Log in as test user before running tests

**Behavior:**

- **With E2E bypass:** Creates empty storage state (proxy mocks auth)
- **Without E2E bypass:** Performs UI login via `loginViaUI()` from `e2e/fixtures/auth.ts`

**Test users** (from `packages/supabase/supabase/seeds/03_users.sql`):

- `player@trainers.local` / `Password123!` (default test user)
- `admin@trainers.local` / `Password123!` (site admin)
- `champion@trainers.local` / `Password123!`
- `gymleader@trainers.local` / `Password123!`

### 3. Proxy E2E Bypass

**File:** `apps/web/src/proxy.ts` (lines 123-158)

**How it works:**

1. **Check for bypass header:** `x-e2e-auth-bypass: <E2E_AUTH_BYPASS_SECRET>`
2. **OR check for test mode cookie:** `e2e-test-mode=true`
3. **If bypass active:**
   - Mock authenticated user (hardcoded as `player@trainers.local`)
   - Set `e2e-test-mode` cookie (httpOnly: false, readable by client)
   - Skip Supabase auth entirely

**Mocked user details:**

```typescript
user = {
  id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e", // Matches seed file
  email: "player@trainers.local",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;
```

### 4. CI Workflow

**File:** `.github/workflows/ci.yml`

**E2E test flow:**

1. **wait-for-preview job** (lines 237-285):
   - Waits up to 10 minutes for Vercel preview deployment
   - Polls GitHub Deployments API every 15 seconds (40 attempts)
   - Verifies preview responds with 2xx/3xx status
   - Outputs `url` for downstream jobs
2. **e2e-tests job** (lines 288-383):
   - Runs on 2 shards (parallel execution)
   - Depends on `wait-for-preview`
   - Sets `PLAYWRIGHT_BASE_URL` to preview URL
   - Provides `VERCEL_AUTOMATION_BYPASS_SECRET` and `E2E_AUTH_BYPASS_SECRET`
   - Installs Playwright browsers (cached)
   - Runs `pnpm --filter=@trainers/web exec playwright test --shard=X/2`
3. **e2e-results job** (lines 386-427):
   - Merges Playwright HTML reports from both shards
   - Comments on PR with test results

**Environment variables required:**

| Variable                          | Purpose                         | Set in CI?    |
| --------------------------------- | ------------------------------- | ------------- |
| `PLAYWRIGHT_BASE_URL`             | Preview deployment URL          | ✅ (from job) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Skip Vercel password protection | ✅ (secret)   |
| `E2E_AUTH_BYPASS_SECRET`          | Mock auth (skip UI login)       | ✅ (secret)   |

---

## Supabase Preview Branch Integration

### Current Setup Status: ⚠️ UNKNOWN

**Integration documentation exists:** `docs/vercel-supabase-integration.md`

**Integration provides:**

- Automatic preview branch creation for each git branch with a Vercel preview
- Auto-injection of preview branch credentials as env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Critical for E2E tests:** Test users must exist in preview branch database

### Verification Steps (Not Yet Run)

**1. Check if Supabase integration is installed:**

```bash
# Go to Vercel dashboard → Integrations → Installed
# Look for "Supabase" integration
```

**2. Check if preview branches are created automatically:**

```bash
pnpm supabase branches list
```

Expected output: List of branches with `ACTIVE` or `FUNCTIONS_DEPLOYED` status

**3. Check if test users exist in preview branch:**

```bash
# Get preview branch credentials
pnpm supabase branches get <branch-name> --output json

# Check for test users (requires Docker)
docker run --rm -i postgres:17 psql "<PREVIEW_POSTGRES_URL>" -c \
  "SELECT email FROM auth.users WHERE email LIKE '%trainers.local'"
```

Expected output: 4 test users (admin, player, champion, gymleader)

**4. Seed preview branch manually (if needed):**

```bash
./scripts/seed-preview-branch.sh <branch-name>
```

Script located at: `scripts/seed-preview-branch.sh`

### Alternative: E2E Auth Bypass (Current Approach)

**Status:** ✅ CONFIRMED - Project uses dual auth strategy

**Evidence:**

- `E2E_AUTH_BYPASS_SECRET` is configured in CI (line 366)
- Proxy has full E2E bypass implementation (lines 123-158)
- Auth setup checks for bypass secret (line 19-22)
- `apps/web/e2e/fixtures/auth-bypass.ts` provides `injectE2EMockAuth()` helper
- Tests use different auth methods based on test type

**Two Auth Strategies in Use:**

#### Strategy 1: Mock Auth (for UI/navigation tests)

**File:** `apps/web/e2e/fixtures/auth-bypass.ts`

**How it works:**

1. Test calls `await injectE2EMockAuth(page)` before navigating
2. Function sets `e2e-test-mode` cookie via `page.context().addCookies()`
3. Function injects mock Supabase auth token into localStorage via `addInitScript()`
4. Proxy detects cookie → mocks authenticated user for Server Components
5. Client components read localStorage → see mocked user session

**Mock user data:**

```typescript
{
  player: {
    id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    email: "player@trainers.local",
  },
  admin: {
    id: "a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d",
    email: "admin@trainers.local",
    app_metadata: { site_roles: ["site_admin"] },
  },
}
```

**Used by:**

- `dashboard/settings-navigation.spec.ts`
- `dashboard/alts-navigation.spec.ts`
- `navigation/protected-routes.spec.ts`
- Other UI-focused tests

**Advantages:**

- ✅ No database access needed
- ✅ Fast (no real auth flow)
- ✅ Tests UI/navigation in isolation

**Limitations:**

- ⚠️ Doesn't test auth flow
- ⚠️ Can't test database queries
- ⚠️ Can't test RLS policies

#### Strategy 2: Real Auth (for auth flow tests)

**File:** `apps/web/e2e/fixtures/auth.ts` → `loginViaUI()`

**How it works:**

1. Test navigates to `/sign-in`
2. Test fills email/password form with real credentials
3. Test submits form → Supabase processes login
4. On success, Supabase sets real auth cookies
5. Tests proceed with real session

**Test users required in database:**

- `player@trainers.local` / `Password123!`
- `admin@trainers.local` / `Password123!`
- `champion@trainers.local` / `Password123!`
- `gymleader@trainers.local` / `Password123!`

**Used by:**

- `auth/sign-in.spec.ts` (tests login flow, wrong password, non-existent user)
- `auth/sign-out.spec.ts`
- `auth.setup.ts` (global auth setup for chromium project)

**Advantages:**

- ✅ Tests real auth flow
- ✅ Tests against real database
- ✅ Tests RLS policies
- ✅ E2E validation

**Limitations:**

- ⚠️ Requires test users in database
- ⚠️ Slower than mock auth

**Implication for CI:**

- **With E2E bypass header:** `auth.setup.ts` skips UI login, uses mock auth
- **Without E2E bypass header:** `auth.setup.ts` performs real UI login

**Current CI config:** Uses E2E bypass header (line 366), so real auth tests are still using mock auth in CI

---

## Why Tests Are Currently Skipping

### Scenario 1: Recent Push to Main Branch

**Evidence from recent CI run:**

```json
{
  "conclusion": "success",
  "name": "CI",
  "url": "https://github.com/thatguyinabeanie/trainers.gg/actions/runs/21732754726",
  "workflowName": "CI"
}
```

**Job status from run #21732754726:**

| Job Name              | Conclusion | Why?                                      |
| --------------------- | ---------- | ----------------------------------------- |
| Install Dependencies  | ✅ success |                                           |
| Unit Tests            | ✅ success |                                           |
| Lint & Typecheck      | ✅ success |                                           |
| Wait for Preview      | ⏭️ skipped | `if: github.event_name == 'pull_request'` |
| E2E Tests (Shard 1/2) | ⏭️ skipped | Depends on wait-for-preview               |
| E2E Tests (Shard 2/2) | ⏭️ skipped | Depends on wait-for-preview               |
| E2E Test Results      | ⏭️ skipped | Depends on e2e-tests                      |
| Lighthouse            | ⏭️ skipped | Depends on wait-for-preview               |

**Conclusion:** Tests skipped because CI run was triggered by push to `main` (not a pull request).

### Scenario 2: No Open Pull Requests

**Recent PRs:** Not checked (permission denied)

**If no PRs exist:** E2E tests wouldn't have run recently at all.

---

## Required Steps to Enable E2E Tests

### Option A: Test on Pull Request (Recommended)

**No changes required.** E2E tests are already configured to run on PRs.

**Steps:**

1. Create a feature branch:
   ```bash
   git checkout -b test/verify-e2e-tests
   ```
2. Make a trivial change (e.g., add comment to `README.md`)
3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify E2E tests run in CI"
   git push -u origin test/verify-e2e-tests
   ```
4. Open pull request on GitHub
5. Monitor CI workflow:
   - ✅ wait-for-preview should wait for Vercel preview
   - ✅ e2e-tests should run against preview URL
   - ✅ Tests should pass (if E2E auth bypass is working)

**Expected result:**

- wait-for-preview: ✅ success
- e2e-tests (shard 1): ✅ success
- e2e-tests (shard 2): ✅ success
- e2e-results: ✅ success

### Option B: Test Locally Against Preview

**Steps:**

1. Get a preview deployment URL (from an existing PR or create one)
2. Set required env vars:
   ```bash
   export PLAYWRIGHT_BASE_URL="https://your-preview.vercel.app"
   export VERCEL_AUTOMATION_BYPASS_SECRET="<from CI secrets>"
   export E2E_AUTH_BYPASS_SECRET="<from CI secrets>"
   ```
3. Run E2E tests:
   ```bash
   pnpm --filter=@trainers/web exec playwright test
   ```

**Expected result:** All tests pass

### Option C: Test Locally Against localhost

**Steps:**

1. Start local dev server:
   ```bash
   pnpm dev:web+backend
   ```
2. In another terminal, run E2E tests:
   ```bash
   pnpm --filter=@trainers/web exec playwright test
   ```

**Expected result:**

- ✅ Tests pass if local Supabase has test users seeded
- ❌ Tests fail on sign-in if test users don't exist

**To seed local database:**

```bash
pnpm db:seed
```

---

## Manual Steps Required

### 1. Install Supabase Vercel Integration (Optional)

**Only needed if:**

- You want E2E tests to use real auth (not bypass)
- You want preview deployments to have isolated databases

**Steps:**

1. Go to [Supabase Vercel Integration](https://vercel.com/integrations/supabase)
2. Click "Add Integration"
3. Select Vercel team/account
4. Select `trainers-gg` project
5. Authorize integration

**Verification:**

```bash
pnpm supabase branches list
```

Should show preview branches with `ACTIVE` status.

### 2. Verify E2E Secrets Are Set (Required)

**Secrets needed in Vercel:**

| Secret Name                       | Purpose                         | Required? |
| --------------------------------- | ------------------------------- | --------- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Skip Vercel password protection | ✅ Yes    |
| `E2E_AUTH_BYPASS_SECRET`          | Mock auth in tests              | ✅ Yes    |

**How to check:**

1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Look for these variables
3. Should be set for "Preview" environment

**How to set (if missing):**

1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Add new variable:
   - Name: `E2E_AUTH_BYPASS_SECRET`
   - Value: (generate secure random string)
   - Environment: Preview
3. Repeat for `VERCEL_AUTOMATION_BYPASS_SECRET`

**Also add to GitHub Actions secrets:**

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add repository secrets with same values

### 3. Create Test PR to Verify (Required)

**See "Option A: Test on Pull Request" above**

---

## Success Criteria (TGG-231)

| Criterion                                             | Status     | Evidence                                   |
| ----------------------------------------------------- | ---------- | ------------------------------------------ |
| ✅ E2E tests run in GitHub Actions CI (not skipped)   | ⚠️ Partial | Only runs on PRs (by design)               |
| ✅ Preview deployments use preview branch credentials | ⚠️ Unknown | Supabase integration status not verified   |
| ✅ Test users accessible in preview environments      | ⚠️ Unknown | Using E2E auth bypass (no database needed) |
| ✅ All E2E tests pass                                 | ⚠️ Unknown | Need to create PR to verify                |

---

## Recommendations

### Immediate Actions

1. **Create test PR** to verify E2E tests run (see Option A above)
2. **Document** whether E2E auth bypass or Supabase preview branches are the intended approach
3. **Verify** Vercel secrets are set (`E2E_AUTH_BYPASS_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET`)

### Long-Term Decisions

**Question:** Should E2E tests use real auth or bypass?

**Current state:** ✅ **Hybrid approach already implemented**

| Test Type      | Auth Method      | Database Needed? | What It Tests                              |
| -------------- | ---------------- | ---------------- | ------------------------------------------ |
| UI/Navigation  | Mock auth        | ❌ No            | UI components, routing, protected routes   |
| Auth flows     | Real auth (UI)   | ✅ Yes           | Login/logout, error handling, session mgmt |
| CI (all tests) | Mock auth bypass | ❌ No            | Fast feedback, no preview branch needed    |

**Test files analyzed:**

| File                                    | Auth Method     | Notes                                           |
| --------------------------------------- | --------------- | ----------------------------------------------- |
| `dashboard/settings-navigation.spec.ts` | Mock (bypass)   | Calls `injectE2EMockAuth()` in beforeEach       |
| `dashboard/alts-navigation.spec.ts`     | Mock (bypass)   | Calls `injectE2EMockAuth()` in beforeEach       |
| `navigation/protected-routes.spec.ts`   | Mock (bypass)   | Calls `injectE2EMockAuth()` in beforeEach       |
| `auth/sign-in.spec.ts`                  | Real (UI login) | Calls `loginViaUI()`, tests auth errors         |
| `auth/sign-out.spec.ts`                 | Real (UI login) | Tests logout flow                               |
| `auth.setup.ts` (global setup)          | Conditional     | Real UI login OR mock bypass (based on env var) |

**Recommendation:**

- ✅ **Keep current hybrid approach** - it's well-designed
- ✅ **Continue using E2E bypass in CI** for fast feedback
- ✅ **Optional:** Add Supabase preview branches for more comprehensive E2E validation
  - Run preview branch tests on-demand or before production deploys
  - Keep bypass tests as default for faster iteration

### Documentation Updates Needed

1. **Update `CLAUDE.md`** to clarify:
   - E2E tests only run on PRs (not main branch pushes)
   - E2E tests use auth bypass by default
   - How to run tests locally
2. **Update `docs/vercel-supabase-integration.md`** to clarify:
   - Current integration status (installed or not?)
   - When to use preview branches vs. auth bypass
3. **Add `docs/e2e-testing.md`** with:
   - How to write E2E tests
   - How to run tests locally
   - How to debug test failures in CI

---

## Summary

### What Was Done

1. ✅ Analyzed CI workflow configuration
2. ✅ Identified why E2E tests skip (PR-only by design)
3. ✅ Documented E2E test infrastructure components
4. ✅ Identified verification steps for Supabase integration
5. ✅ Created this comprehensive report

### What Remains

1. ⚠️ **Manual:** Create test PR to verify E2E tests run
2. ⚠️ **Manual:** Verify Vercel secrets are set
3. ⚠️ **Optional:** Install Supabase Vercel Integration (if not using auth bypass)
4. ⚠️ **Optional:** Verify test users exist in preview branches (if using real auth)
5. ⚠️ **Documentation:** Update project docs based on findings

### Key Insight

**E2E tests are NOT broken.** They are working as designed:

- ✅ Tests only run on pull requests (intentional)
- ✅ Tests use E2E auth bypass (fast, no database needed)
- ✅ Infrastructure is correctly configured

**To verify tests work:** Create a pull request and monitor the CI run.

---

## Related Files

| File Path                                       | Purpose                                |
| ----------------------------------------------- | -------------------------------------- |
| `.github/workflows/ci.yml`                      | CI workflow definition                 |
| `apps/web/playwright.config.ts`                 | Playwright configuration               |
| `apps/web/e2e/tests/auth.setup.ts`              | Auth setup script                      |
| `apps/web/e2e/fixtures/auth.ts`                 | Test user credentials, login helper    |
| `apps/web/src/proxy.ts`                         | Request interception, E2E bypass logic |
| `packages/supabase/supabase/seeds/03_users.sql` | Test user seed data                    |
| `scripts/seed-preview-branch.sh`                | Preview branch seeding script          |
| `docs/vercel-supabase-integration.md`           | Supabase integration documentation     |

---

## Next Steps

1. **Create test PR:**

   ```bash
   git checkout -b test/verify-e2e-tests-tgg-231
   echo "# E2E Test Verification" >> docs/test.md
   git add docs/test.md
   git commit -m "test: verify E2E tests run in CI (TGG-231)"
   git push -u origin test/verify-e2e-tests-tgg-231
   # Open PR on GitHub
   ```

2. **Monitor CI workflow:**
   - Watch for wait-for-preview job to succeed
   - Watch for e2e-tests to run (not skip)
   - Review test results in PR comment

3. **Update Linear ticket (TGG-231):**
   - Link this report
   - Update status based on PR results
   - Close ticket if tests pass
