-- Remove beta invite system tables and related feature flag seed rows.
-- Feature flags infrastructure (table, RLS, admin panel) remains for dashboard_stats.

DROP TABLE IF EXISTS public.beta_invites CASCADE;
DROP TABLE IF EXISTS public.waitlist CASCADE;

DELETE FROM public.feature_flags WHERE key IN ('maintenance_mode', 'open_registration');
