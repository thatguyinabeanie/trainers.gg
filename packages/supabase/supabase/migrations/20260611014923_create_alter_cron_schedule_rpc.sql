-- ============================================================================
-- Migration: admin_alter_cron_schedule RPC
--
-- SECURITY DEFINER wrapper around cron.alter_job so site admins can change a
-- job's schedule at runtime (Config tab) without a redeploy. Gated to site
-- admins (user_roles.role_id = 1). Validates the cron expression before
-- touching pg_cron so an obviously-bad string fails loudly.
--
-- NOTE: The function body references cron.job / cron.alter_job, which only
-- exist where pg_cron is installed (production). Local db:reset does not have
-- pg_cron, so this CREATE OR REPLACE FUNCTION will still succeed (the body is
-- not executed at create time), but a runtime call locally would error. That is
-- acceptable — the Config tab's cadence editor is a production capability. Do
-- not wrap the CREATE in a pg_cron-availability guard; only the call needs the
-- extension.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_alter_cron_schedule(
  p_job_name text,
  p_schedule text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  -- 1. Authorization: site admins only.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id = 1
  ) THEN
    RAISE EXCEPTION 'Not authorized: site admin required';
  END IF;

  -- 2. Restrict to the three managed jobs.
  IF p_job_name NOT IN ('import-tick-sync', 'import-tick-import', 'import-tick-compile') THEN
    RAISE EXCEPTION 'Unknown job: %', p_job_name;
  END IF;

  -- 3. Validate the cron expression: 5 whitespace-separated fields, each made
  --    only of digits, * , - / characters. Rejects empty / malformed strings.
  IF p_schedule !~ '^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$' THEN
    RAISE EXCEPTION 'Invalid cron expression: must have 5 fields';
  END IF;
  IF p_schedule ~ '[^0-9*,/\-\s]' THEN
    RAISE EXCEPTION 'Invalid cron expression: illegal characters';
  END IF;

  -- 4. Resolve the job id and apply the new schedule.
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = p_job_name;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Job % is not scheduled', p_job_name;
  END IF;

  PERFORM cron.alter_job(job_id := v_job_id, schedule := p_schedule);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_alter_cron_schedule(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_alter_cron_schedule(text, text) TO authenticated;
