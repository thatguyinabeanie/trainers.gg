-- =============================================================================
-- Allow clearing birth_date via update_my_user_pii()
-- =============================================================================
-- Prior to this migration, passing NULL for p_birth_date was treated as "leave
-- unchanged" via COALESCE, making it impossible to clear a previously-set
-- birth date. This adds an explicit p_clear_birth_date flag so callers can opt
-- into a NULL write.
--
-- Behavior with the new parameter:
--   p_clear_birth_date = true   → sets birth_date = NULL regardless of p_birth_date
--   p_clear_birth_date = false  → keeps existing COALESCE(p_birth_date, existing) logic
--
-- The new parameter is LAST with a DEFAULT so all existing callers continue to
-- work without modification (backward compatible).
-- =============================================================================

-- Drop the prior 3-arg overload first. Adding a parameter does NOT replace the
-- existing function — it creates a SECOND overload, and a call that omits
-- p_clear_birth_date is then ambiguous between the two ("function is not
-- unique"). Dropping the old signature leaves exactly one function.
DROP FUNCTION IF EXISTS public.update_my_user_pii(text, text, date);

CREATE OR REPLACE FUNCTION public.update_my_user_pii(
  p_first_name      text    DEFAULT NULL,
  p_last_name       text    DEFAULT NULL,
  p_birth_date      date    DEFAULT NULL,
  p_clear_birth_date boolean DEFAULT false
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
    birth_date = CASE
      WHEN p_clear_birth_date THEN NULL
      ELSE COALESCE(EXCLUDED.birth_date, private.user_pii.birth_date)
    END;

  RETURN QUERY
    SELECT p.first_name, p.last_name, p.birth_date
    FROM private.user_pii p
    WHERE p.user_id = v_uid;
END;
$$;

COMMENT ON FUNCTION public.update_my_user_pii(text, text, date, boolean) IS
  'Upserts the authenticated caller''s own PII row in private.user_pii and '
  'returns the resulting first/last/birth_date. NULL args leave a field '
  'unchanged (COALESCE). Set p_clear_birth_date = true to explicitly clear '
  'birth_date to NULL. SECURITY DEFINER — private schema is unreachable '
  'directly; scoped to auth.uid() so a user can only write their own row.';

REVOKE EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date, boolean) TO authenticated;
