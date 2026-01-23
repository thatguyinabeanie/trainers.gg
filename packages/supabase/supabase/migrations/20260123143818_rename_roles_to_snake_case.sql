-- =============================================================================
-- Migration: Rename roles to snake_case
-- =============================================================================
-- Changes:
--   - Renames "Site Admin" role to "site_admin" for consistency
--   - Role names should use snake_case (no spaces) for easier programmatic access
-- =============================================================================

-- Rename the Site Admin role to site_admin
UPDATE public.roles
SET name = 'site_admin'
WHERE name = 'Site Admin' AND scope = 'site';

-- Update the custom_access_token_hook to use the new role name
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

-- Update the is_site_admin function to use the new role name
CREATE OR REPLACE FUNCTION "public"."is_site_admin"() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.scope = 'site'
      AND r.name = 'site_admin'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
