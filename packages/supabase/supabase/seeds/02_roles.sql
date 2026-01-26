-- =============================================================================
-- 02_roles.sql - Create Required Roles
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Creates roles that are normally created by migrations, but ensures they
-- exist for preview branches and fresh databases.
-- =============================================================================

INSERT INTO public.roles (name, description, scope) VALUES
  ('Site Admin', 'Full administrative access to the entire platform', 'site'),
  ('org_owner', 'Full control over the organization', 'organization'),
  ('org_admin', 'Administrative privileges', 'organization'),
  ('org_moderator', 'Can moderate content and users', 'organization'),
  ('org_tournament_organizer', 'Can create and manage tournaments', 'organization'),
  ('org_judge', 'Can resolve match disputes', 'organization')
ON CONFLICT (name, scope) DO NOTHING;
