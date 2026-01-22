# Seed Data Setup for Development

## Overview

BattleStadium includes comprehensive seed data scripts for development that populate the database with realistic test data. These scripts are **STRICTLY FOR DEVELOPMENT ONLY** and include multiple safety mechanisms to prevent accidental execution in production or preview environments.

## Safety Mechanisms

All seed scripts require the `ENABLE_SEEDING=true` environment variable to be explicitly set. This prevents:

- Accidental seeding in production deployments
- Seeding in preview/staging environments
- Unauthorized database population

## Setup Instructions

### 1. Set Environment Variable in Convex Dashboard

**🚨 CRITICAL: Only do this for your development deployment**

1. Go to your Convex Dashboard: https://dashboard.convex.dev
2. Select your **development** project
3. Navigate to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Key**: `ENABLE_SEEDING`
   - **Value**: `true`
5. Click **Save**

**⚠️ NEVER set this variable in production or preview deployments**

### 2. Set Environment Variable Locally

The `.env.local` file should already include:

```bash
# 🚨 DEVELOPMENT ONLY - Enables seed data scripts
# NEVER set this to true in production or preview environments
ENABLE_SEEDING=true
```

If not present, add it manually.

## Running Seed Scripts

### Option 1: Automatic Seeding During Vercel Builds

**🚨 NEW: Seeding now runs automatically during Vercel builds!**

The build script (`bun build`) will automatically seed data if:

1. `VERCEL_ENV` is NOT `production` (allows preview and development builds)
2. `ENABLE_SEEDING=true` environment variable is set in Vercel

**To enable seeding for preview deployments:**

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Add `ENABLE_SEEDING=true` for the **Preview** environment scope
3. Deploy a preview branch - seeding will run automatically during build

**Production builds:** Seeding is automatically skipped (even if `ENABLE_SEEDING` is set)

### Option 2: Manual Comprehensive Seed

Seeds all data including users, organizations, tournaments, matches, teams:

```bash
# Run the comprehensive seed through the Convex dashboard
# Or use the convex CLI:
bunx convex run convex/comprehensiveSeed:seedComprehensiveData
```

### Option 3: Run Basic RBAC Seed

Seeds only permissions and roles:

```bash
bunx convex run convex/seed:seedRbac
```

### Option 4: Sync Seeded Users with Clerk

After seeding data, sync users with Clerk for authentication:

```bash
# To sync users and receive credentials in response
bun convex:sync-clerk

# Or via HTTP endpoint (if you need passwords in response for testing)
curl "http://localhost:3000/api/clerk-sync?includeCredentials=true"
```

This will:

- Create Clerk accounts for all seeded users
- Generate **cryptographically secure random passwords** (128 bits of entropy)
- Update Convex users with real Clerk IDs
- Optionally return credentials in response (when `includeCredentials=true` query param is used)

## Test User Credentials

After syncing with Clerk, passwords are generated using cryptographically secure random values.

**🔐 Security Note:**

- Passwords are **random and unique** for each account (not predictable patterns)
- Each password is 32 characters of hexadecimal (16 bytes of random data)
- Passwords are NOT returned by default - use `?includeCredentials=true` query parameter to receive them
- These accounts are **DEV ONLY** and should NEVER exist in production

**Getting Credentials:**

To retrieve the generated credentials after sync:

```bash
# Via npm script (credentials displayed in terminal)
bun convex:sync-clerk

# Via HTTP endpoint with credentials in response
curl "http://localhost:3000/api/clerk-sync?includeCredentials=true"
```

**Test Accounts Created:**

| Email                            | Role                 | Password Type               |
| -------------------------------- | -------------------- | --------------------------- |
| `admin@battlestadium.local`      | Admin                | Random (see sync response)  |
| `organizer1@battlestadium.local` | Tournament Organizer | Random (see sync response)  |
| `player1@battlestadium.local`    | Competitive Player   | Random (see sync response)  |
| `judge1@battlestadium.local`     | Judge                | Random (see sync response)  |
| `coach1@battlestadium.local`     | Coach                | Random (see sync response)  |
| _(20+ more users)_               | Various              | All unique random passwords |

**⚠️ Important Security Considerations:**

1. **Development Only**: These accounts and passwords are generated ONLY when `ENABLE_SEEDING=true`
2. **Production Safety**: The sync endpoint is completely disabled in production (returns 403 Forbidden)
3. **Credentials Opt-in**: Passwords are only included in HTTP responses when explicitly requested via query parameter
4. **Random Generation**: Uses Web Crypto API (`crypto.getRandomValues()`) for cryptographically secure randomness
5. **No Pattern Guessing**: Unlike predictable patterns, these passwords cannot be guessed or brute-forced
6. **Logging**: Credentials are logged to console during sync - do not share logs publicly

## Seeded Data Overview

The comprehensive seed script creates:

- **25+ users** with varied types (admins, organizers, judges, competitive players, casual players, coaches, streamers)
- **7 organizations** with different tiers (partner, verified, regular) and RBAC staff assignments
- **12 tournaments** in various states (completed, active, upcoming, draft)
- **Tournament phases, rounds, and matches** with realistic data
- **Player statistics** calculated from match history
- **Pokemon teams** with 6 Pokemon each for competitive players

## Troubleshooting

### "Seeding is DISABLED" Error

If you see this error, it means `ENABLE_SEEDING` is not set to `true`:

```
🚨 PRODUCTION SAFETY: Seeding is DISABLED. Set ENABLE_SEEDING=true environment variable in Convex dashboard for development deployments only.
```

**Solution**: Follow the setup instructions above to set the environment variable in your Convex dashboard.

### Clerk Sync Fails

If Clerk sync fails with "DISABLED" error:

```bash
🚨 PRODUCTION SAFETY: Clerk sync is DISABLED.
```

**Solution**: Ensure `ENABLE_SEEDING=true` is set in your `.env.local` file.

### Already Seeded

The comprehensive seed script checks if data already exists and will skip if more than 10 users are found:

```json
{
  "message": "Database already has comprehensive seed data (25 users found)",
  "skipped": true
}
```

This is expected behavior and prevents duplicate seeding.

## Production Safety Checklist

Before deploying to production or preview environments:

- [ ] Verify `ENABLE_SEEDING` is **NOT** set in production environment variables
- [ ] Confirm preview deployments do **NOT** have `ENABLE_SEEDING` set
- [ ] Test that seed scripts fail with safety error in non-dev environments
- [ ] Never commit sensitive data or real user information to seed scripts

## Development Workflow

### Local Development

1. **First time setup**:

   ```bash
   # Set ENABLE_SEEDING=true in Convex dashboard for dev deployment
   bunx convex run convex/comprehensiveSeed:seedComprehensiveData
   bun convex:sync-clerk
   ```

2. **Reset and re-seed** (if needed):

   ```bash
   # Clear data in Convex dashboard
   bunx convex run convex/comprehensiveSeed:seedComprehensiveData
   bun convex:sync-clerk
   ```

3. **Develop and test**:
   ```bash
   bun dev
   # Log in with test credentials
   # Test features with realistic data
   ```

### Preview Deployments with Seeding

1. **Enable seeding for preview branches**:
   - Go to Vercel dashboard → Your Project → Settings → Environment Variables
   - Add `ENABLE_SEEDING=true` for the **Preview** environment scope
   - Ensure `ENABLE_SEEDING=true` is also set in Convex dashboard for dev deployment

2. **Deploy preview branch**:

   ```bash
   git push origin feature-branch
   # Vercel will automatically build and seed data
   ```

3. **Test with seeded data**:
   - Access preview URL
   - Log in with test credentials (see table above)
   - Test features with realistic data

### Production Workflow

Production builds **never** run seeding, regardless of environment variables. This is enforced by checking `VERCEL_ENV !== "production"` in the build script.
