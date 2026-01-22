-- =============================================================================
-- Migration: Fix custom_access_token_hook function
-- =============================================================================
-- Fixes SQL error: "missing FROM-clause entry for table custom_access_token_hook"
-- The issue was using function_name.variable_name syntax which PostgreSQL
-- interprets as a table reference. Fixed by renaming local variable.
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  _user_id uuid;  -- Renamed to avoid ambiguity with column name
  is_admin boolean;
BEGIN
  -- Get the user ID from the event
  _user_id := (event->>'user_id')::uuid;
  
  -- Check if user is a site admin
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.scope = 'site'
      AND r.name = 'Site Admin'
  ) INTO is_admin;
  
  -- Build the claims object
  claims := event->'claims';
  
  IF is_admin THEN
    claims := jsonb_set(claims, '{is_site_admin}', 'true'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{is_site_admin}', 'false'::jsonb);
  END IF;
  
  -- Return the modified event with new claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Ensure permissions are set correctly
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "supabase_auth_admin";
