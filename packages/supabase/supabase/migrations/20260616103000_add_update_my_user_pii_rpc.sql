-- =============================================================================
-- update_my_user_pii() — own-row PII write RPC (companion to get_my_user_pii)
-- =============================================================================
-- private.user_pii lives in a non-exposed schema, so authenticated callers
-- cannot UPDATE it via PostgREST (PGRST106). Profile-settings and onboarding
-- need to write the caller's own first/last/birth_date, so we expose a
-- SECURITY DEFINER upsert scoped to auth.uid().
--
-- Companion to get_my_user_pii() from 20260616100000. Returns the updated row
-- as a column-list TABLE (not the private composite type) so an authenticated
-- caller never needs USAGE on the private schema.
--
-- NULL semantics: a NULL argument is treated as "leave unchanged" via COALESCE,
-- so callers can update a single field without clobbering the others.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_my_user_pii(
  p_first_name text DEFAULT NULL,
  p_last_name  text DEFAULT NULL,
  p_birth_date date DEFAULT NULL
)
RETURNS TABLE (first_name text, last_name text, birth_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'update_my_user_pii: no authenticated user';
  END IF;

  INSERT INTO private.user_pii (user_id, first_name, last_name, birth_date)
  VALUES (v_uid, p_first_name, p_last_name, p_birth_date)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, private.user_pii.first_name),
    last_name  = COALESCE(EXCLUDED.last_name,  private.user_pii.last_name),
    birth_date = COALESCE(EXCLUDED.birth_date, private.user_pii.birth_date);

  RETURN QUERY
    SELECT p.first_name, p.last_name, p.birth_date
    FROM private.user_pii p
    WHERE p.user_id = v_uid;
END;
$$;

COMMENT ON FUNCTION public.update_my_user_pii(text, text, date) IS
  'Upserts the authenticated caller''s own PII row in private.user_pii and '
  'returns the resulting first/last/birth_date. NULL args leave a field '
  'unchanged (COALESCE). SECURITY DEFINER — private schema is unreachable '
  'directly; scoped to auth.uid() so a user can only write their own row.';

REVOKE EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date) TO authenticated;
