-- ============================================================================
-- Migration: Create import_runs observability log
--
-- One row per source per import "tick" — written by the import-queue cron route
-- (trigger 'cron') and the admin "Process now" action (trigger 'manual'). Gives
-- admins a recent-runs feed so they can see, without reading server logs,
-- whether the Limitless / RK9 / compile pipeline actually ran, what it
-- processed, and why a source was skipped.
--
-- Writes happen only via the service-role client (RLS bypassed). Reads are
-- restricted to site admins, matching the sibling site_config table.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_runs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      text NOT NULL,                    -- 'limitless' | 'rk9' | 'compile'
  trigger     text NOT NULL,                    -- 'cron' | 'manual'
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL DEFAULT 'running',  -- running | ok | partial | error | skipped
  skip_reason text,                             -- populated when status = 'skipped'
  processed   int NOT NULL DEFAULT 0,           -- items processed this run
  errors      int NOT NULL DEFAULT 0,           -- errors encountered this run
  remaining   int,                              -- queue depth left after the run (null if unknown)
  detail      jsonb,                            -- full per-source result object for debugging

  -- Constrain the enum-like text columns at the DB level so a bad write fails
  -- loudly rather than silently storing a typo'd status/source.
  CONSTRAINT import_runs_source_check
    CHECK (source IN ('limitless', 'rk9', 'compile')),
  CONSTRAINT import_runs_trigger_check
    CHECK (trigger IN ('cron', 'manual')),
  CONSTRAINT import_runs_status_check
    CHECK (status IN ('running', 'ok', 'partial', 'error', 'skipped'))
);

COMMENT ON TABLE public.import_runs IS 'Observability log for the Limitless/RK9 import pipeline — one row per source per tick.';
COMMENT ON COLUMN public.import_runs.detail IS 'Full per-source worker result object (jsonb) for post-hoc debugging.';

-- ---------------------------------------------------------------------------
-- 2. Index
--
-- The admin recent-runs feed filters by source and orders by started_at DESC.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_import_runs_source_started
  ON public.import_runs (source, started_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS
--
-- SELECT for site admins only (role_id = 1 = site_admin), reusing the predicate
-- from public.site_config. No INSERT/UPDATE/DELETE policies: the cron route and
-- admin action write with the service-role key, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admins can read import runs" ON public.import_runs;
CREATE POLICY "Site admins can read import runs"
  ON public.import_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
        AND role_id = 1
    )
  );
