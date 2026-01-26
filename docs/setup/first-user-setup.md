# First User Setup Guide

This guide explains how to set up user accounts on trainers.gg, including local development and production environments.

## Overview

trainers.gg uses Supabase Auth for authentication. When a user signs up:

1. Supabase creates an entry in `auth.users`
2. A database trigger creates a corresponding `public.users` record
3. An alt is automatically created in the `alts` table
4. Optionally, a Bluesky PDS account is created for federation

## Local Development Setup

### Prerequisites

- Docker (for local Supabase)
- Node.js 20+
- pnpm 9+

### Quick Start

1. **Start local Supabase and reset the database**

   ```bash
   pnpm db:reset
   ```

   This applies all migrations and runs the seed script, creating test users.

2. **Start the development server**

   ```bash
   pnpm dev
   ```

3. **Sign in with a test account**

   | Email                   | Password    | Username      | Site Admin |
   | ----------------------- | ----------- | ------------- | ---------- |
   | admin@trainers.local    | password123 | admin_trainer | Yes        |
   | player@trainers.local   | password123 | ash_ketchum   | No         |
   | champion@trainers.local | password123 | cynthia       | No         |

### Manual User Creation (Local)

If you need to create additional users locally:

1. **Via Supabase Studio**
   - Open http://localhost:54323 (Supabase Studio)
   - Go to Authentication > Users
   - Click "Add User" and fill in details
   - The trigger will create the `users` and `alts` records

2. **Via the Sign-Up UI**
   - Navigate to http://localhost:3000/sign-up
   - Complete the registration form

## Production Setup

### First Admin User

For a fresh production deployment:

1. **Sign up through the UI**
   - Navigate to `https://trainers.gg/sign-up`
   - Create your account with email and password

2. **Assign site admin role**
   - Connect to the production database via Supabase Dashboard
   - Run the following SQL:

   ```sql
   -- Find the site_admin role ID
   SELECT id FROM roles WHERE name = 'site_admin' AND scope = 'site';

   -- Assign the role to your user (replace with your user ID)
   INSERT INTO user_roles (user_id, role_id)
   VALUES ('your-user-uuid', (SELECT id FROM roles WHERE name = 'site_admin' AND scope = 'site'));
   ```

### Verifying Setup

Check that the user was created correctly:

```sql
-- Check users table
SELECT id, username, email, main_alt_id FROM users WHERE email = 'your@email.com';

-- Check alts table
SELECT id, username, display_name FROM alts WHERE user_id = 'your-user-uuid';

-- Check user_roles for site admin
SELECT ur.*, r.name as role_name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = 'your-user-uuid';
```

## Database Schema

### Key Tables

| Table        | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `users`      | User accounts (linked to auth.users)            |
| `alts`       | Alternate player identities for tournaments     |
| `user_roles` | Site-level role assignments (e.g., site_admin)  |
| `roles`      | Role definitions with scope (site/organization) |

### Automatic Record Creation

When a user signs up, the `handle_new_user` trigger automatically:

1. Creates a `public.users` record with the auth user ID
2. Creates an initial `alts` record with the username from signup
3. Sets `main_alt_id` on the user to point to the created alt

## Troubleshooting

### User Not Created in public.users

If sign-up succeeds but no user appears in `public.users`:

1. Check the trigger exists:

   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check for trigger function errors in Supabase logs

### Can't Sign In

1. Verify the user exists in `auth.users` (via Supabase Dashboard)
2. Check environment variables are set correctly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Permission Denied Errors

1. Check RLS policies are enabled on relevant tables
2. Verify the user has the correct roles assigned
3. Use `is_site_admin()` helper to check admin status:
   ```sql
   SELECT is_site_admin();  -- Returns true if current user is site admin
   ```

## Related Documentation

- [AGENTS.md](../../AGENTS.md) - Full architecture and coding guidelines
- [packages/supabase/README.md](../../packages/supabase/README.md) - Supabase package documentation
