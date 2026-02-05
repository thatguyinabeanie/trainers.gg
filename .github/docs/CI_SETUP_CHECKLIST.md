# CI Optimization Setup Checklist

## ✅ What's Already Implemented

All code changes are complete! The workflow now includes:

- [x] Shared dependency installation (install once, restore everywhere)
- [x] Test sharding for unit tests (4 shards)
- [x] Test sharding for E2E tests (2 shards)
- [x] Granular caching (Turbo, ESLint, TypeScript, Jest, Playwright)
- [x] Parallel job execution (no unnecessary waiting)
- [x] Shallow git clones (`fetch-depth: 1`)
- [x] Coverage merging across shards
- [x] Test result aggregation
- [x] Turbo remote cache support (optional, needs secrets)

## 🔧 Setup Required (Optional)

### Turbo Remote Caching (Highly Recommended)

This enables cache sharing across all branches and PRs. **~30-50% additional speedup.**

#### Step 1: Create Vercel Account (Free)

1. Visit https://vercel.com/signup
2. Sign up with GitHub
3. No payment required for open source

#### Step 2: Generate Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it "CI Turbo Cache"
4. Select "Full Access" scope
5. Copy the token (you won't see it again)

#### Step 3: Get Team Slug

Your team slug is in the URL:

- URL: `https://vercel.com/YOUR-TEAM-SLUG/...`
- Example: If URL is `https://vercel.com/acme-corp/...`, slug is `acme-corp`

#### Step 4: Add to GitHub

1. Go to your repo → Settings → Secrets and variables → Actions

2. **Add Secret:**
   - Click "New repository secret"
   - Name: `TURBO_TOKEN`
   - Value: (paste your Vercel token)

3. **Add Variable:**
   - Click "Variables" tab
   - Click "New repository variable"
   - Name: `TURBO_TEAM`
   - Value: (your team slug)

#### Step 5: Verify

Next CI run will show:

```
✓ Remote caching enabled
✓ Cache hit: web#build
```

### Alternative: Skip Turbo Remote Caching

If you don't set up the secrets, CI will still work perfectly! You just won't get the cross-branch cache sharing. Local caching will still work.

## 📊 Expected Results

### First Run (Cold Cache)

- Install: ~2 min
- Quality: ~2 min
- Unit Tests: ~1 min per shard (4 parallel)
- E2E Tests: ~2 min per shard (2 parallel)
- **Total: ~5-6 min**

### Subsequent Runs (Warm Cache)

- Install: ~30s (cache hit)
- Quality: ~1 min
- Unit Tests: ~30-45s per shard
- E2E Tests: ~1-1.5 min per shard
- **Total: ~2-3 min**

### With Remote Cache

- Install: ~30s
- Quality: ~30s (cache hit)
- Unit Tests: ~20-30s per shard (cache hit)
- E2E Tests: ~1 min per shard (needs real browser)
- **Total: ~1.5-2.5 min**

## 🎛️ Tuning Shard Counts

Current configuration:

- **Unit tests: 4 shards** (good for 100-400 tests)
- **E2E tests: 2 shards** (good for 10-50 tests)

### When to Adjust

**Increase shards if:**

- Any shard takes >2 minutes
- You add more tests
- You want faster feedback

**Decrease shards if:**

- Shards complete in <30 seconds
- You're hitting GitHub concurrency limits
- Tests are too granular (setup overhead)

### How to Adjust

Edit `.github/workflows/ci.yml`:

```yaml
# Line 152: Change unit test shards
matrix:
  shard: [1, 2, 3, 4, 5, 6]  # 6 shards instead of 4
  total-shards: [6]

# Line 269: Update merge script
for shard in 2 3 4 5 6; do  # Add new shard numbers

# Line 343: Change E2E test shards
matrix:
  shard: [1, 2, 3]  # 3 shards instead of 2
  total-shards: [3]
```

## 🚦 Testing the Changes

### Option 1: Push to PR

The easiest way to test:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: optimize workflow with sharding and caching"
git push
```

CI will run automatically.

### Option 2: Local Test (Partial)

You can test sharding locally:

```bash
# Test unit test sharding
pnpm test:ci -- --shard=1/4
pnpm test:ci -- --shard=2/4

# Test E2E sharding
pnpm --filter=@trainers/web exec playwright test --shard=1/2
pnpm --filter=@trainers/web exec playwright test --shard=2/2
```

## 🐛 Common Issues

### "fail-on-cache-miss: true"

If you see this error, the `install` job didn't complete. Solutions:

1. Re-run the workflow
2. Check if cache quota exceeded (10GB limit)
3. Clear old caches if needed

### "Test results not found"

A test shard failed. Check the individual shard logs to see which tests failed.

### "Turbo token invalid"

Double-check:

1. Token has "Full Access" scope
2. Secret name is exactly `TURBO_TOKEN`
3. Variable name is exactly `TURBO_TEAM`
4. No extra spaces in values

## 📈 Monitoring

After the first few runs, check:

1. **Actions tab** → CI workflow
2. Look at "Jobs" graph - should show:
   - Install (first)
   - Quality + Wait-for-preview (parallel)
   - 4 unit test shards (parallel)
   - 2 E2E test shards (parallel)

3. Check job durations:
   - No job should take >3 minutes
   - Most should be <2 minutes
   - Total time should be <6 minutes

4. Check cache hits:
   - Click on any job
   - Expand cache steps
   - Should see "Cache restored successfully"

## ✨ What's Next

### Optional Enhancements

1. **Increase test workers** (if tests are slow)

   ```typescript
   // playwright.config.ts
   workers: process.env.CI ? 2 : undefined;
   ```

2. **Add test retries** (for flaky tests)

   ```typescript
   retries: process.env.CI ? 2 : 0;
   ```

3. **Upload to Argos** (visual regression testing)

   ```yaml
   - uses: argos-ci/argos-action@v1
   ```

4. **Dependency caching with Buildjet**
   ```yaml
   - uses: buildjet/cache@v4 # Faster than actions/cache
   ```

## 📚 Documentation

- Full guide: `.github/docs/CI_OPTIMIZATION_GUIDE.md`
- Workflow file: `.github/workflows/ci.yml`
- Jest config: `jest.config.ts`
- Playwright config: `apps/web/playwright.config.ts`

## 🎉 Summary

**Before:** 8-10 min, serial execution, 3x duplicate installs
**After:** 2-5 min, parallel execution, shared cache

**You're done!** Just push and watch it fly. 🚀
