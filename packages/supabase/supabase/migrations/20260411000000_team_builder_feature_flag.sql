-- =============================================================================
-- Migration: Team Builder Feature Flag
-- =============================================================================
-- 1. Insert team_builder feature flag row
-- 2. Update custom_access_token_hook to add team_builder_access JWT claim
-- =============================================================================

-- =============================================================================
-- Insert team_builder feature flag
-- =============================================================================
INSERT INTO public.feature_flags (key, description, enabled, metadata)
VALUES ('team_builder', 'Controls access to the team builder feature', false, '{"allowed_users": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Update custom_access_token_hook to include team_builder_access claim
-- =============================================================================
-- Preserves existing site_roles logic and adds team_builder_access boolean.
-- Access is granted when: flag is globally enabled, user is in the allowlist,
-- or user has the site_admin role.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  _user_id uuid;
  _site_roles text[];
  _team_builder_access boolean;
BEGIN
  _user_id := (event->>'user_id')::uuid;

  -- Get all site-scoped role names for this user
  SELECT ARRAY_AGG(r.name)
  INTO _site_roles
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = _user_id
    AND r.scope = 'site';

  -- Check team builder access: enabled globally, user in allowlist, or site admin
  SELECT
    COALESCE(ff.enabled, false)
    OR COALESCE(ff.metadata->'allowed_users' @> to_jsonb(_user_id::text), false)
    OR COALESCE('site_admin' = ANY(_site_roles), false)
  INTO _team_builder_access
  FROM feature_flags ff
  WHERE ff.key = 'team_builder';

  -- Default to false if no feature flag row exists
  IF _team_builder_access IS NULL THEN
    _team_builder_access := false;
  END IF;

  -- Build the claims object with site_roles array and team_builder_access boolean
  claims := event->'claims';
  claims := jsonb_set(claims, '{site_roles}', COALESCE(to_jsonb(_site_roles), '[]'::jsonb));
  claims := jsonb_set(claims, '{team_builder_access}', to_jsonb(_team_builder_access));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
