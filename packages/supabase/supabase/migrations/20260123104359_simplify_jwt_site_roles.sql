-- =============================================================================
-- Migration: Simplify JWT claims - replace is_site_admin with site_roles array
-- =============================================================================
-- Changes:
--   - Removes is_site_admin boolean from JWT claims
--   - Adds site_roles array containing all site-scoped role names
--   - Consumers can derive is_site_admin via: site_roles.includes("site_admin")
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
BEGIN
  _user_id := (event->>'user_id')::uuid;
  
  -- Get all site-scoped role names for this user
  SELECT ARRAY_AGG(r.name)
  INTO _site_roles
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = _user_id
    AND r.scope = 'site';
  
  -- Build the claims object with site_roles array
  claims := event->'claims';
  claims := jsonb_set(claims, '{site_roles}', COALESCE(to_jsonb(_site_roles), '[]'::jsonb));
  
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
