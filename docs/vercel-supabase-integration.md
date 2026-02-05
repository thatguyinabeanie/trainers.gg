# Vercel + Supabase Integration for E2E Tests

## Problem

E2E tests in GitHub Actions CI are failing because:

- Vercel preview deployments use **production Supabase** credentials
- Production database doesn't have **test users** (player@trainers.local, etc.)
- Auth setup fails → tests redirect to sign-in

## Solution

Configure the **Supabase Vercel Integration** to automatically use preview branch credentials for preview deployments.

## Setup Steps

### 1. Install Supabase Integration on Vercel

1. Go to [Supabase Vercel Integration](https://vercel.com/integrations/supabase)
2. Click "Add Integration"
3. Select your Vercel team/account
4. Select the `trainers-gg` project
5. Authorize Supabase to access your Vercel project

### 2. Configure Integration

The integration will automatically:

- Create Supabase preview branches for each git branch with a Vercel preview deployment
- Inject preview branch credentials as environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` → preview branch URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → preview branch anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → preview branch service role key

### 3. Verify Preview Branch Seeding

Preview branches should automatically run migrations. To verify seeds are running:

```bash
# Get preview branch credentials
pnpm supabase branches get feat/mvp-tickets --output json

# Check if test users exist (using docker since psql not installed locally)
docker run --rm -i postgres:17 psql "<POSTGRES_URL>" -c \
  "SELECT email FROM auth.users WHERE email LIKE '%trainers.local'"
```

If no test users exist, seed the preview branch:

```bash
./scripts/seed-preview-branch.sh feat/mvp-tickets
```

## How It Works

### Production Deployments (main branch)

- Use production Supabase credentials
- Real user data
- No test users

### Preview Deployments (feature branches)

- Use preview branch Supabase credentials
- Migrations auto-applied
- Seeded test users available:
  - `player@trainers.local` / `Password123!`
  - `admin@trainers.local` / `Password123!`
  - `champion@trainers.local` / `Password123!`
  - `gymleader@trainers.local` / `Password123!`

### E2E Test Flow in CI

1. **wait-for-preview** job waits for Vercel preview deployment
2. Vercel creates preview deployment with Supabase preview branch credentials (via integration)
3. **e2e-tests** job runs against preview URL
4. Auth setup (`auth.setup.ts`) logs in as `player@trainers.local`
5. Login succeeds because test users exist in preview branch
6. Storage state saved with valid session
7. Tests load valid auth state → pass ✅

## Alternative: Manual Configuration (if integration unavailable)

If the Vercel integration isn't available, manually configure preview environment variables:

1. Go to Vercel Project Settings → Environment Variables
2. Add preview-specific variables:
   - Variable: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (get from `pnpm supabase branches get <branch> --output json`)
   - Environment: **Preview** only
   - Git Branch: `feat/*` (or specific branch patterns)

3. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Note:** This approach requires updating variables for each preview branch manually.

## Troubleshooting

### Tests still failing after integration

1. **Check preview branch status:**

   ```bash
   pnpm supabase branches list
   ```

   Status should be `ACTIVE` or `FUNCTIONS_DEPLOYED`

2. **Verify Vercel is using preview credentials:**
   - Check deployment logs in Vercel
   - Look for `NEXT_PUBLIC_SUPABASE_URL` value
   - Should match preview branch URL (not production)

3. **Check if seeds ran:**

   ```bash
   # Get preview branch URL from branches list
   docker run --rm -i postgres:17 psql "<PREVIEW_POSTGRES_URL>" -c \
     "SELECT COUNT(*) FROM auth.users WHERE email LIKE '%trainers.local'"
   ```

   Should return 4 (admin, player, champion, gymLeader)

4. **Manually seed if needed:**
   ```bash
   ./scripts/seed-preview-branch.sh <branch-name>
   ```

### Preview branch not created

- Ensure Supabase GitHub integration is enabled
- Check that git branch matches Supabase branch naming pattern
- Manually create: `pnpm supabase branches create <branch-name>`

## References

- [Supabase Vercel Integration Docs](https://supabase.com/docs/guides/platform/vercel-integration)
- [Supabase Preview Branches](https://supabase.com/docs/guides/platform/branching)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
