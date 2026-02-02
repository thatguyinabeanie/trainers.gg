-- Fix is_site_admin() function to use snake_case role name.
-- Migration 20260123143818 renamed the role from 'Site Admin' to 'site_admin',
-- but migration 20260128000000 recreated the function with the old name.

CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND r.scope = 'site'
      AND r.name = 'site_admin'
  )
$$;
