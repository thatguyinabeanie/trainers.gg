-- Fix mutable search_path on SECURITY DEFINER functions.
-- Adding SET search_path = '' prevents search-path manipulation attacks.

-- 1. lock_teams_on_tournament_start (trigger function)
CREATE OR REPLACE FUNCTION public.lock_teams_on_tournament_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE public.tournament_registrations
    SET team_locked = true
    WHERE tournament_id = NEW.id
    AND team_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. get_org_id_from_group_role
CREATE OR REPLACE FUNCTION public.get_org_id_from_group_role(p_group_role_id bigint)
RETURNS bigint AS $$
  SELECT g.organization_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE gr.id = p_group_role_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

-- 3. get_role_name_from_group_role
CREATE OR REPLACE FUNCTION public.get_role_name_from_group_role(p_group_role_id bigint)
RETURNS text AS $$
  SELECT r.name
  FROM public.group_roles gr
  JOIN public.roles r ON gr.role_id = r.id
  WHERE gr.id = p_group_role_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

-- 4. is_org_owner
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id bigint, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND owner_user_id = p_user_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

-- 5. user_has_org_role
CREATE OR REPLACE FUNCTION public.user_has_org_role(p_org_id bigint, p_user_id uuid, p_role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    JOIN public.groups g ON gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    WHERE ugr.user_id = p_user_id
      AND g.organization_id = p_org_id
      AND r.name = p_role_name
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';
