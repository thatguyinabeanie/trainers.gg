-- =============================================================================
-- P1: Split PII out of public.users into private.user_pii
-- =============================================================================
--
-- DESIGN SUMMARY
-- --------------
-- PostgREST only serves schemas listed in config.toml's `[api] schemas`
-- (currently ["public","limitless","rk9","graphql_public"]). The `private`
-- schema is intentionally NOT listed there, so no API caller can ever reach
-- private.user_pii over the Data API (PGRST106). This is the strongest available
-- isolation: PII is unreachable by construction, not just by policy.
--
-- EMAIL IS NOT STORED HERE
-- auth.users is the canonical source of truth for email. Dropping public.users.email
-- removes the staleness risk and the UNIQUE(email) / idx_users_email concern.
-- auth.users already enforces email uniqueness. We read email via a SECURITY
-- DEFINER function (get_email_by_username) that joins auth.users at call time.
-- We never DDL auth.users and we never expose it via a view.
--
-- AUTHENTICATED-READ REGRESSION FIX (from migration 20260615195810)
-- Migration 195810 set both views to security_invoker=true and added an anon
-- RLS policy, but forgot to add an equivalent policy for the `authenticated`
-- role. This broke cross-user profile lookups (e.g. public profile pages for
-- logged-in users, staff activity feeds). We fix that here by adding:
--   CREATE POLICY "authenticated read public user profiles" ON public.users
--     FOR SELECT TO authenticated USING (true);
-- This is safe because public.users now holds ZERO PII — every private column
-- has been moved to private.user_pii or dropped entirely.
--
-- SIGNUP TRIGGER CRITICALITY
-- A failure inside handle_new_user() propagates as an error to
-- auth.signUp(), blocking ALL new registrations. The function is redefined
-- here to stop writing email into public.users (the column is being dropped)
-- and to write first/last/birth_date into private.user_pii after the users
-- row is inserted (FK order: public.users first, then private.user_pii).
-- The birth_date cast is guarded: a null or non-date value produces NULL
-- (never an exception) so a bad OAuth payload cannot abort signup.
--
-- WHAT THIS MIGRATION DOES
-- 1. Create the private schema (non-exposed, no PostgREST access)
-- 2. Create private.user_pii with RLS (defense-in-depth)
-- 3. Backfill existing first/last/birth_date rows before column drop
-- 4. Drop email + 3 dead columns (phone_number, external_accounts,
--    public_metadata) + the moving columns (first_name, last_name, birth_date)
--    Indexes and constraints on those columns drop automatically via CASCADE
-- 5. Fix the authenticated-read regression on public.users
-- 6. Redefine handle_new_user() — no email in public.users, writes PII to private
-- 7. Redefine get_email_by_username() — now reads from auth.users via JOIN
-- 8. Add functional index on lower(username) for the case-insensitive lookup
-- 9. Add get_my_user_pii() RPC — own-row PII read for profile/settings pages
--
-- DEPENDENCIES HANDLED IN THIS MIGRATION
-- • users_email_key UNIQUE constraint → drops automatically with the email column
-- • idx_users_email btree index → drops automatically with the email column
-- • users_first_name_idx / users_last_name_idx / users_birth_date_idx →
--   drop automatically with their columns
-- • get_email_by_username() → redefined (was reading from public.users.email;
--   now reads from auth.users joined to public.users via id)
-- • handle_new_user() trigger → redefined (was inserting email into public.users
--   and had no private.user_pii write; now skips email, writes PII to private)
-- • public_user_profiles view → already recreated as security_invoker=true in
--   195810; its column list does NOT include email/first_name/last_name/birth_date
--   so no redefinition needed here — the view remains valid after the column drop
-- • anon column-level GRANT on public.users from 195810 → still valid (none of
--   the granted columns are being dropped here: id, username, bio, country,
--   image, did, pds_handle, main_alt_id, created_at, name, is_coach)
-- =============================================================================


-- =============================================================================
-- SECTION 1 — Private schema
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all access from API-facing roles. Only postgres (migrations) and
-- service_role (backend admin ops) can reach this schema.
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
-- Note: service_role has implicit superuser-like access and is not revoked.
-- postgres role runs migrations and retains schema ownership implicitly.


-- =============================================================================
-- SECTION 2 — private.user_pii table
-- =============================================================================

CREATE TABLE IF NOT EXISTS private.user_pii (
  -- Mirrors public.users.id 1-to-1. ON DELETE CASCADE so deleting the user
  -- cleans up PII automatically (no orphan risk).
  user_id   uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  birth_date date
);

COMMENT ON TABLE private.user_pii IS
  'Owner-only PII for registered users. Not exposed via PostgREST (private '
  'schema). Readable only by the owning user via get_my_user_pii() RPC and '
  'by service-role server-side joins (admin, staff-roster embeds).';

COMMENT ON COLUMN private.user_pii.user_id    IS 'FK to public.users.id — 1-to-1, cascades on delete';
COMMENT ON COLUMN private.user_pii.first_name IS 'Legal first name — sourced from raw_user_meta_data at signup or from profile update';
COMMENT ON COLUMN private.user_pii.last_name  IS 'Legal last name — sourced from raw_user_meta_data at signup or from profile update';
COMMENT ON COLUMN private.user_pii.birth_date IS 'Date of birth for age verification — sourced from raw_user_meta_data at signup or from profile update';

-- Enable RLS — defense-in-depth even though the schema is unreachable via API.
ALTER TABLE private.user_pii ENABLE ROW LEVEL SECURITY;

-- Own-row read: a user can only see their own PII row.
DROP POLICY IF EXISTS "users can read own pii" ON private.user_pii;
CREATE POLICY "users can read own pii"
  ON private.user_pii FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Own-row update: a user can only update their own PII row.
DROP POLICY IF EXISTS "users can update own pii" ON private.user_pii;
CREATE POLICY "users can update own pii"
  ON private.user_pii FOR UPDATE
  TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Own-row insert: only the user themselves (or service-role via trigger) inserts.
DROP POLICY IF EXISTS "users can insert own pii" ON private.user_pii;
CREATE POLICY "users can insert own pii"
  ON private.user_pii FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Note: service_role bypasses RLS implicitly — no service_role policy needed.
-- There is no DELETE policy for authenticated: users cannot self-delete PII rows
-- (account deletion is an admin operation handled service-side with cascade).


-- =============================================================================
-- SECTION 3 — Backfill: move existing PII data before dropping the columns
-- =============================================================================

-- Insert all existing rows. ON CONFLICT DO NOTHING is idempotent for replays.
-- Rows where all three values are NULL are still inserted to keep the 1-to-1
-- relationship intact (get_my_user_pii expects a row to exist).
INSERT INTO private.user_pii (user_id, first_name, last_name, birth_date)
SELECT id, first_name, last_name, birth_date
FROM public.users
ON CONFLICT (user_id) DO NOTHING;


-- =============================================================================
-- SECTION 4 — Drop PII columns from public.users
-- =============================================================================
-- Dropping a column drops any indexes or constraints that reference ONLY that
-- column. Affected objects:
--   • users_email_key UNIQUE constraint   → auto-dropped with email
--   • idx_users_email btree index         → auto-dropped with email
--   • users_first_name_idx btree index    → auto-dropped with first_name
--   • users_last_name_idx btree index     → auto-dropped with last_name
--   • users_birth_date_idx btree index    → auto-dropped with birth_date
-- auth.users enforces email uniqueness — no constraint to recreate here.
-- Indexes on first/last/birth_date in private.user_pii are not recreated now;
-- if an admin-user-search feature needs them, add them in a future migration.

ALTER TABLE public.users
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS external_accounts,
  DROP COLUMN IF EXISTS public_metadata;


-- =============================================================================
-- SECTION 5 — Fix authenticated-read regression on public.users
-- =============================================================================
-- Migration 20260615195810 added an anon policy (USING true) but omitted the
-- equivalent for authenticated. Any logged-in user viewing another user's public
-- profile (e.g. /players/[username], staff activity feed) got 0 rows from
-- PostgREST. public.users now holds zero PII (every private column dropped
-- above), so allowing all-row reads by authenticated is safe.
--
-- The existing policies that stay in place:
--   "anon read public user profiles"  — added by 20260615195810
--   "Users can update own record"     — added by 20260128000000
--   "Users can only create own record" — added by 20260128000000
-- (The old "Allow user creation" policy was dropped by 20260127100000.)

DROP POLICY IF EXISTS "authenticated read public user profiles" ON public.users;
CREATE POLICY "authenticated read public user profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "authenticated read public user profiles" ON public.users IS
  'All-row SELECT for authenticated users. Safe because public.users holds no '
  'PII after the 20260616100000 migration (email/first_name/last_name/birth_date '
  'dropped; phone_number/external_accounts/public_metadata dropped).';


-- =============================================================================
-- SECTION 6 — Redefine handle_new_user() — CRITICAL: failure blocks all signups
-- =============================================================================
-- Changes from the previous version (20260510220127):
--   • Removed `email` from the INSERT into public.users (column no longer exists)
--   • Removed `user_email` variable (no longer needed for public.users)
--   • Added INSERT INTO private.user_pii after the public.users row is created
--     (FK order: public.users must exist before private.user_pii can reference it)
--   • birth_date cast is guarded with NULLIF to prevent a bad OAuth value from
--     raising an exception and aborting the entire signup transaction
-- Everything else is preserved verbatim from 20260510220127.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_meta        jsonb;
  user_username   text;
  user_name       text;
  user_avatar     text;
  new_user_id     uuid;
  new_alt_id      bigint;
  final_username  text;
  username_suffix text;
  attempt_count   int := 0;
  pii_first_name  text;
  pii_last_name   text;
  pii_birth_date  date;
BEGIN
  -- Extract metadata from the auth.users NEW row
  raw_meta := NEW.raw_user_meta_data;

  -- Get username from OAuth metadata only (NO email fallback)
  user_username := COALESCE(
    raw_meta->>'username',
    raw_meta->>'preferred_username'
  );

  -- If no username from OAuth, create a temporary placeholder.
  -- Placeholder usernames must be replaced during onboarding.
  IF user_username IS NULL OR user_username = '' THEN
    user_username := 'temp_' || substr(gen_random_uuid()::text, 1, 12);
  ELSE
    -- Clean username: lowercase, replace invalid chars with underscore
    user_username := lower(regexp_replace(user_username, '[^a-z0-9_-]', '_', 'g'));

    -- Ensure minimum length
    IF length(user_username) < 3 THEN
      user_username := user_username || '_user';
    END IF;
  END IF;

  -- Get display name from metadata, fall back to cleaned username
  user_name := COALESCE(
    raw_meta->>'name',
    raw_meta->>'full_name',
    user_username
  );

  -- Get avatar URL from metadata
  user_avatar := COALESCE(
    raw_meta->>'avatar_url',
    raw_meta->>'picture'
  );

  -- Ensure username uniqueness by appending a random suffix when needed.
  -- Checks both public.alts and public.users to avoid cross-table conflicts.
  final_username := user_username;
  WHILE EXISTS (
    SELECT 1 FROM public.alts WHERE username = final_username
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE username = final_username
  ) LOOP
    attempt_count := attempt_count + 1;
    IF attempt_count > 10 THEN
      -- Fallback to UUID-based username after 10 failed attempts
      final_username := 'user_' || substr(gen_random_uuid()::text, 1, 8);
      EXIT;
    END IF;
    username_suffix := substr(md5(random()::text), 1, 4);
    final_username := user_username || '_' || username_suffix;
  END LOOP;

  -- Step 1: Create the public.users row (no email — sourced from auth.users).
  -- id, username, name, image are all that belongs in the public table now.
  INSERT INTO public.users (
    id,
    username,
    name,
    image,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    final_username,
    user_name,
    user_avatar,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Step 2: Create the alt record (main alt for the user — always public).
  INSERT INTO public.alts (
    user_id,
    username,
    avatar_url,
    is_public,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    final_username,
    user_avatar,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_alt_id;

  -- Step 3: Link main alt back to the user record.
  UPDATE public.users
  SET main_alt_id = new_alt_id
  WHERE id = new_user_id;

  -- Step 4: Write PII to private.user_pii (FK satisfied: public.users row exists).
  -- birth_date: guard the cast with NULLIF so an empty string or malformed value
  -- produces NULL rather than raising an exception and aborting signup.
  pii_first_name := NULLIF(TRIM(raw_meta->>'first_name'), '');
  pii_last_name  := NULLIF(TRIM(raw_meta->>'last_name'),  '');
  BEGIN
    pii_birth_date := NULLIF(TRIM(raw_meta->>'birth_date'), '')::date;
  EXCEPTION WHEN others THEN
    -- Any cast failure (invalid date format from OAuth payload) → NULL.
    -- Never abort signup over a bad birth_date.
    pii_birth_date := NULL;
  END;

  INSERT INTO private.user_pii (user_id, first_name, last_name, birth_date)
  VALUES (new_user_id, pii_first_name, pii_last_name, pii_birth_date)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function for new user signup. Creates public.users and public.alts '
  'records, then inserts PII (first/last/birth_date) into private.user_pii. '
  'Email is NOT stored in public.users — read from auth.users at query time. '
  'Username extracted from OAuth metadata (username, preferred_username). '
  'Generates temp_<uuid> placeholder when no OAuth username is available — '
  'placeholder must be replaced during onboarding. '
  'birth_date cast is guarded: bad OAuth values produce NULL (never abort signup). '
  'CRITICAL: a failure in this function blocks ALL new registrations.';


-- =============================================================================
-- SECTION 7 — Redefine get_email_by_username() — reads from auth.users
-- =============================================================================
-- The previous version (20260612203733) read email from public.users.email,
-- which no longer exists. We now JOIN public.users (for the username lookup)
-- to auth.users (for the canonical email).
--
-- search_path is set to '' (empty) — explicit schema qualification is used
-- throughout. This is safer than SET search_path = public because auth.users
-- lives in the auth schema which would need to be in the path otherwise.
--
-- Preserved from 20260612203733:
--   • SECURITY DEFINER (required to read auth.users)
--   • Function signature: get_email_by_username(p_username text) RETURNS text
--   • Case-insensitive match: lower(u.username) = lower(p_username)
--   • REVOKE EXECUTE FROM PUBLIC + GRANT TO anon only (authenticated revoked
--     by 20260615195820 — do not re-grant to authenticated here)

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.email
  FROM auth.users au
  JOIN public.users u ON u.id = au.id
  WHERE lower(u.username) = lower(p_username)
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_email_by_username(text) IS
  'Anon sign-in path: resolves a username → email before a session exists. '
  'SECURITY DEFINER reads auth.users (not accessible to anon directly). '
  'Case-insensitive match (lower/lower) aligns with the ilike() used in the '
  'alt-lookup fallback path. Email is no longer stored in public.users; this '
  'function is the canonical path for username-to-email resolution.';

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
-- Grant to anon only — authenticated was revoked in 20260615195820 and must
-- NOT be re-granted here (authenticated users have no legitimate reason to
-- look up other users'' emails by username — privacy risk).
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;


-- =============================================================================
-- SECTION 8 — Functional index for case-insensitive username lookup
-- =============================================================================
-- get_email_by_username uses: WHERE lower(u.username) = lower(p_username)
-- Without an index on lower(username) this is a sequential scan on public.users.
-- A functional B-tree index satisfies the predicate exactly.

CREATE INDEX IF NOT EXISTS users_lower_username_idx
  ON public.users (lower(username));


-- =============================================================================
-- SECTION 9 — get_my_user_pii() RPC — own-row PII read for settings/profile
-- =============================================================================
-- Returns the caller's own private.user_pii row. Used by profile settings
-- pages and onboarding flows that need to display first/last/birth_date.
--
-- SECURITY DEFINER so the function can read private.user_pii (the schema is
-- unreachable for direct queries even with authenticated role). search_path=''
-- forces full qualification and prevents search_path injection.
--
-- The RLS policy on private.user_pii (own-row only) provides defense-in-depth
-- but the WHERE clause enforces the same invariant at the query level.
--
-- Returns an anonymous TABLE rather than the `private.user_pii` composite type
-- ON PURPOSE: an authenticated caller (and PostgREST introspection running as
-- that role) has no USAGE on the `private` schema, so exposing the private
-- composite type as the return type can raise "permission denied for schema
-- private". A column-list TABLE return has no schema dependency and sidesteps
-- that entirely while returning exactly the fields callers need.

CREATE OR REPLACE FUNCTION public.get_my_user_pii()
RETURNS TABLE (first_name text, last_name text, birth_date date)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.first_name, p.last_name, p.birth_date
  FROM private.user_pii p
  WHERE p.user_id = (SELECT auth.uid())
$$;

COMMENT ON FUNCTION public.get_my_user_pii() IS
  'Returns the authenticated caller''s own PII row from private.user_pii. '
  'SECURITY DEFINER required because private schema is unreachable directly. '
  'Never returns another user''s row — WHERE user_id = auth.uid() is enforced '
  'at both query and RLS levels.';

REVOKE EXECUTE ON FUNCTION public.get_my_user_pii() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_user_pii() TO authenticated;
-- anon intentionally excluded — they have no auth.uid() and no PII row.
