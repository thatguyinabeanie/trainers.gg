-- =============================================================================
-- Normalize empty-string PII first/last name to NULL in update_my_user_pii()
-- =============================================================================
-- The validator + profile action treat an empty string as a "clear this field"
-- sentinel for first_name / last_name (an omitted/undefined field is sent as
-- NULL = "leave unchanged"). The prior RPC body used COALESCE(EXCLUDED.x,
-- existing), which stored "" literally instead of clearing the column --
-- inconsistent with how birth_date is cleared to NULL via p_clear_birth_date,
-- and producing an "" vs NULL storage divergence.
--
-- This replaces the COALESCE with a CASE that distinguishes the three caller
-- intents using the raw parameter (which preserves "" as distinct from NULL):
--   p_first_name IS NULL   -> field omitted        -> leave existing value
--   p_first_name = ''       -> explicit clear        -> store NULL
--   p_first_name = 'value'  -> set to that value
--
-- Signature and return type are unchanged, so generated types are unaffected.
-- CREATE OR REPLACE preserves the existing EXECUTE grants; the COMMENT and
-- grants are re-stated for clarity and idempotency.
-- =============================================================================

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

  -- On INSERT (no existing row) "" and NULL both mean "no value yet", so NULLIF
  -- collapses "" -> NULL. On UPDATE the CASE below distinguishes omitted (NULL,
  -- leave unchanged) from an explicit clear ("" -> NULL).
  INSERT INTO private.user_pii (user_id, first_name, last_name, birth_date)
  VALUES (v_uid, NULLIF(p_first_name, ''), NULLIF(p_last_name, ''), p_birth_date)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = CASE
      WHEN p_first_name IS NULL THEN private.user_pii.first_name
      ELSE NULLIF(p_first_name, '')
    END,
    last_name = CASE
      WHEN p_last_name IS NULL THEN private.user_pii.last_name
      ELSE NULLIF(p_last_name, '')
    END,
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
  'returns the resulting first/last/birth_date. For first_name/last_name: a '
  'NULL argument leaves the field unchanged, an empty string clears it to NULL, '
  'and a non-empty value sets it. Set p_clear_birth_date = true to explicitly '
  'clear birth_date to NULL (otherwise NULL birth_date leaves it unchanged). '
  'SECURITY DEFINER — private schema is unreachable directly; scoped to '
  'auth.uid() so a user can only write their own row.';

REVOKE EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_user_pii(text, text, date, boolean) TO authenticated;
