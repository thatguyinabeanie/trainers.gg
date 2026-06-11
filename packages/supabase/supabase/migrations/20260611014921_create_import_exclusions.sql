-- ============================================================================
-- Migration: import_exclusions — tombstones for "Delete & exclude"
--
-- When an admin chooses "Delete & exclude" on an event, we cascade-purge it and
-- record a tombstone here so the Sync stage's discover step never re-adds it.
-- Tombstones are clearable (an exclusion can be undone) and visible to admins.
-- Writes come from the service-role client (RLS bypassed) via server actions;
-- reads are restricted to site admins, matching public.import_runs / site_config.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_exclusions (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source          text NOT NULL,              -- 'rk9' | 'limitless'
  source_event_id text NOT NULL,              -- rk9 event_id / limitless tournament_id
  reason          text,                       -- optional admin note
  excluded_at     timestamptz NOT NULL DEFAULT now(),
  excluded_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,

  CONSTRAINT import_exclusions_source_check
    CHECK (source IN ('rk9', 'limitless'))
);

COMMENT ON TABLE public.import_exclusions IS
  'Tombstones for events the Sync stage must never re-discover (Delete & exclude).';

-- ---------------------------------------------------------------------------
-- 2. Index
--
-- One tombstone per source event — unique constraint doubles as the lookup
-- index the discover step uses to check whether an event is excluded.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_exclusions_source_event
  ON public.import_exclusions (source, source_event_id);

CREATE INDEX IF NOT EXISTS idx_import_exclusions_excluded_by
  ON public.import_exclusions (excluded_by)
  WHERE excluded_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS
--
-- SELECT for site admins only (role_id = 1 = site_admin), reusing the predicate
-- from public.import_runs / public.site_config. No INSERT/UPDATE/DELETE
-- policies: the admin "Delete & exclude" action writes with the service-role
-- key, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------

ALTER TABLE public.import_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admins can read import exclusions" ON public.import_exclusions;
CREATE POLICY "Site admins can read import exclusions"
  ON public.import_exclusions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role_id = 1
    )
  );
-- No INSERT/UPDATE/DELETE policies: writes go through the service-role client.
