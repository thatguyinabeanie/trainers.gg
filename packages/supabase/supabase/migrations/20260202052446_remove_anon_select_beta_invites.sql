-- Remove anon SELECT policy on beta_invites.
-- The validateInviteToken server action uses createServiceRoleClient() which
-- bypasses RLS entirely, so anon access to this table is unnecessary.
-- Leaving it would expose all invite tokens, emails, and metadata to anyone
-- with the public anon key via the Supabase REST API.

DROP POLICY IF EXISTS "Anon can validate invite tokens" ON public.beta_invites;
