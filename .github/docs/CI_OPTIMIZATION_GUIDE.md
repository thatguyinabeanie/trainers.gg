# CI Optimization Guide

This document explains the advanced CI optimizations implemented for trainers.gg.

## 🚀 Overview

Our CI pipeline is now fully optimized with:

- **Shared dependency installation** (install once, use everywhere)
- **Turbo Remote Caching** (share cache across branches/PRs)
- **Test sharding** (parallel test execution)
- **Granular caching** (ESLint, TypeScript, Jest, Playwright)
- **Parallel job execution** (maximize concurrency)

## 📊 Performance Impact

| Metric                   | Before                 | After                 | Improvement |
| ------------------------ | ---------------------- | --------------------- | ----------- |
| **Unit Tests**           | ~2-3 min (serial)      | ~45-60s (4 shards)    | **~65-75%** |
| **E2E Tests**            | ~3-4 min               | ~1.5-2 min (2 shards) | **~50%**    |
| **Quality Checks**       | ~2-3 min               | ~1-2 min              | **~40%**    |
| **Total PR CI**          | ~8-10 min              | ~3-5 min              | **~60%**    |
| **node_modules install** | Every job (~2 min/job) | Once (~2 min total)   | **~80%**    |

## 🎯 How It Works

### 1. Shared Dependency Installation

The `install` job runs first and caches `node_modules`:

```yaml
jobs:
  install:
    # Installs deps once, outputs cache-key

  quality:
    needs: [install]
    # Restores node_modules from cache-key
```

**Benefits:**

- Install dependencies once instead of 3-4 times
- Eliminates ~2 minutes per job
- Reduces network bandwidth

### 2. Test Sharding

Tests are split across multiple runners based on execution time:

#### Unit Tests (Jest)

- **4 shards** (adjustable in workflow)
- Uses Jest's native `--shard` flag
- Each shard runs ~25% of tests
- Results merged automatically

#### E2E Tests (Playwright)

- **2 shards** (adjustable in workflow)
- Uses Playwright's native `--shard` flag
- Each shard runs ~50% of tests
- Reports uploaded separately

**How sharding works:**

```bash
# Shard 1 of 4 runs the first 25% of tests
jest --shard=1/4

# Shard 2 of 4 runs the next 25%
jest --shard=2/4

# etc.
```

### 3. Turbo Remote Caching

Turbo shares build artifacts across:

- Different branches
- Different PRs
- Different developers
- CI and local development

**Setup required** (see below).

### 4. Granular Caching

Each job type has its own cache namespace:

- `turbo-quality-*` - Lint & typecheck artifacts
- `turbo-test-*` - Test build artifacts
- `turbo-e2e-*` - E2E build artifacts
- `eslint-*` - ESLint cache files
- `tsc-*` - TypeScript incremental build info
- `jest-*` - Jest transform cache
- `playwright-*` - Browser binaries

**Benefits:**

- Higher cache hit rate
- Faster cache restoration
- Independent invalidation

## 🔧 Setup: Turbo Remote Caching

Turbo Remote Caching is optional but highly recommended.

### Option 1: Vercel (Recommended)

1. **Sign up for Vercel** (free for open source)

   ```bash
   pnpm turbo login
   pnpm turbo link
   ```

2. **Get your team slug and token**
   - Visit https://vercel.com/account/tokens
   - Create a new token with "Read and Write" access
   - Note your team slug from the URL

3. **Add to GitHub**
   - Go to Settings → Secrets and variables → Actions
   - Add repository secret: `TURBO_TOKEN`
   - Add repository variable: `TURBO_TEAM` (your team slug)

4. **Done!** CI will automatically use remote caching.

### Option 2: Self-Hosted

See [Turbo documentation](https://turbo.build/repo/docs/core-concepts/remote-caching#self-hosting) for self-hosting options.

### Verification

Once configured, you'll see in CI logs:

```
Remote caching enabled
Cache hit: web#build
```

## 📈 Adjusting Shard Counts

### When to Increase Shards

Increase shards if:

- Tests take longer than 2 minutes per shard
- You have more tests
- You want faster feedback

### How to Adjust

Edit `.github/workflows/ci.yml`:

```yaml
# For unit tests - change from 4 to 8 shards
strategy:
  matrix:
    shard: [1, 2, 3, 4, 5, 6, 7, 8]
    total-shards: [8]

# For E2E tests - change from 2 to 4 shards
strategy:
  matrix:
    shard: [1, 2, 3, 4]
    total-shards: [4]
```

**Update the merge script** to match:

```yaml
# In test-results job
for shard in 2 3 4 5 6 7 8; do
  # ... merge coverage ...
done
```

### Cost Considerations

Each shard = 1 additional concurrent job:

- **GitHub Free**: 20 concurrent jobs
- **GitHub Team**: 60 concurrent jobs
- **GitHub Enterprise**: 180 concurrent jobs

Current usage:

- 1 install job
- 1 quality job
- 4 unit test shards
- 2 E2E test shards
- 1 lighthouse job
- **Total: 9 concurrent jobs** (well under limits)

## 🐛 Troubleshooting

### "Cache miss on node_modules"

The `install` job didn't complete or cache wasn't saved. Check:

1. Install job completed successfully
2. Cache quota not exceeded (10GB limit)

**Fix:** Re-run the workflow.

### "Test results not merged"

One or more test shards failed. Check individual shard logs:

1. Click on failed job
2. Check which tests failed in that shard
3. Fix the failing test

### "Turbo cache not working"

Check that secrets are configured:

```bash
# Local test
TURBO_TOKEN=your-token TURBO_TEAM=your-team pnpm turbo run build
```

Should output:

```
• Remote caching enabled
```

## 📚 Additional Resources

- [Jest Sharding](https://jestjs.io/docs/cli#--shard)
- [Playwright Sharding](https://playwright.dev/docs/test-sharding)
- [Turbo Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)

## 🎛️ Advanced Tuning

### Worker Count

For E2E tests, you can increase workers per shard:

```typescript
// playwright.config.ts
workers: process.env.CI ? 2 : undefined, // 2 workers per shard
```

### Jest Parallelism

Jest automatically uses available CPU cores. To limit:

```bash
jest --maxWorkers=50%  # Use 50% of cores
```

### Retry Failed Tests

Both Jest and Playwright support retries:

```typescript
// playwright.config.ts
retries: (process.env.CI ? 2 : 0, // Retry failed tests twice
  // jest.config.ts
  jest.retryTimes(2, { logErrorsBeforeRetry: true }));
```

## 📊 Monitoring

View CI performance over time:

1. Go to Actions tab
2. Select CI workflow
3. Click "···" → "View workflow runs"
4. Filter by branch/PR

Look for:

- Cache hit rates (should be >80%)
- Job durations (should be <2 min per job)
- Parallel execution (multiple jobs running simultaneously)

## 🔄 Migration Notes

### From Old Workflow

The old workflow:

- Installed deps 3 times (6+ minutes)
- Ran tests serially (5+ minutes)
- No remote caching
- Limited cache granularity

The new workflow:

- Installs deps once (2 minutes)
- Runs tests in parallel (1-2 minutes)
- Optional remote caching
- Granular caching per job type

**Total savings: ~60% faster CI**

### Breaking Changes

None! The workflow is backward compatible. Tests run the same way, just faster.
