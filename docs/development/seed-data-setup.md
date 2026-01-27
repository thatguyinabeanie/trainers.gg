# Seed Data Setup for Development

## Overview

trainers.gg uses SQL seed files for local development that populate the database with realistic test data. These seeds are automatically applied when running `supabase db reset`.

**For the enhanced seed data implementation plan, see: [Enhanced Seed Data Plan](./enhanced-seed-data-plan.md)**

## Current Seed Files

Located in `packages/supabase/supabase/seeds/`:

| File                   | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `01_extensions.sql`    | Enable required PostgreSQL extensions                                  |
| `02_roles.sql`         | Create RBAC roles (Site Admin, org_admin, org_judge, etc.)             |
| `03_users.sql`         | Create test users via auth.users (triggers create public.users + alts) |
| `04_organizations.sql` | Create organizations and staff assignments                             |
| `05_invitations.sql`   | Organization invitations                                               |
| `06_pokemon.sql`       | Pokemon species data                                                   |
| `07_teams.sql`         | Pokemon teams for players                                              |
| `08_tournaments.sql`   | Tournaments and registrations                                          |
| `09_social.sql`        | Social features data                                                   |

## Test User Credentials

All test users share the same password for development convenience:

| Email                      | Username      | Password       | Role                         |
| -------------------------- | ------------- | -------------- | ---------------------------- |
| `admin@trainers.local`     | admin_trainer | `Password123!` | Site Admin, Org Owner        |
| `player@trainers.local`    | ash_ketchum   | `Password123!` | Org Owner (Pallet Town)      |
| `champion@trainers.local`  | cynthia       | `Password123!` | Org Owner (Sinnoh Champions) |
| `gymleader@trainers.local` | brock         | `Password123!` | Staff                        |
| `elite@trainers.local`     | karen         | `Password123!` | Staff                        |
| `casual@trainers.local`    | red           | `Password123!` | Player                       |

**Password Requirements** (Supabase Auth):

- 8+ characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one symbol

## Running Seeds

### Full Database Reset (Recommended)

```bash
cd packages/supabase
pnpm db:reset
```

This will:

1. Stop the local Supabase instance
2. Reset the database to a clean state
3. Apply all migrations
4. Run all seed files in order

### Start Fresh Development Environment

```bash
# From repo root
pnpm dev:backend      # Starts Supabase (runs pnpm setup automatically)
pnpm db:reset         # Reset and seed database
pnpm dev:web          # Start web app
```

## Seed File Guidelines

### Idempotency

All seed files should be **idempotent** - running them multiple times produces the same result:

```sql
-- Good: Uses ON CONFLICT to handle duplicates
INSERT INTO public.organizations (name, slug, ...)
VALUES ('VGC League', 'vgc-league', ...)
ON CONFLICT (slug) DO NOTHING;

-- Good: Checks for existence before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tournaments WHERE slug = 'weekly-42') THEN
    INSERT INTO public.tournaments (...) VALUES (...);
  END IF;
END $$;
```

### Dependencies

Seed files are numbered to ensure correct execution order:

- `03_users.sql` depends on `02_roles.sql`
- `04_organizations.sql` depends on `03_users.sql`
- `08_tournaments.sql` depends on `03_users.sql` and `04_organizations.sql`

### User Creation Pattern

Users must be created via `auth.users` (Supabase Auth), not directly in `public.users`:

```sql
-- Create user in auth.users (trigger creates public.users + alts)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  '00000000-0000-0000-0000-000000000000',
  'user@trainers.local',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  NOW(),
  'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"username": "my_username", "first_name": "First", "last_name": "Last"}'::jsonb,
  NOW(), NOW(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Also create auth identity for email login
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'email',
  '{"sub": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d", "email": "user@trainers.local", "email_verified": true}'::jsonb,
  NOW(), NOW(), NOW()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Then update the created user/alt with additional data
UPDATE public.users SET birth_date = '1990-01-15', country = 'US'
WHERE id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
```

## Troubleshooting

### Seeds Not Applied

If seeds don't appear to be applied:

```bash
# Check if Supabase is running
pnpm db:status

# Force a full reset
pnpm db:reset
```

### User Login Fails

If you can't log in with test credentials:

1. Verify the user exists in `auth.users`:

   ```sql
   SELECT id, email FROM auth.users WHERE email LIKE '%@trainers.local';
   ```

2. Verify the identity exists:

   ```sql
   SELECT * FROM auth.identities WHERE user_id = 'your-user-id';
   ```

3. Re-run the database reset:
   ```bash
   pnpm db:reset
   ```

### Password Hash Issues

If passwords aren't working, ensure the `pgcrypto` extension is enabled:

```sql
-- Check if extension exists
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- The extension should be enabled in 01_extensions.sql
```

## Production Safety

Seed files are **ONLY for local development**. They are:

- Not applied in production (Supabase hosted)
- Not applied in preview branches (migrations only)
- Only run locally via `supabase db reset`

**Never commit real user data or production credentials to seed files.**

## Next Steps

See [Enhanced Seed Data Plan](./enhanced-seed-data-plan.md) for the comprehensive seed data implementation that includes:

- ~300-350 users with Faker.js-generated names
- 5 organizations with weekly tournament schedules
- 120 tournaments over 12 weeks of history
- 256-player flagship tournaments
- ~16,000+ matches with deterministic results
