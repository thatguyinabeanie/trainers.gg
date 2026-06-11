-- ============================================================================
-- Migration: team_slots polymorphic source FKs (ON DELETE CASCADE)
--
-- team_slots is polymorphic: each row comes from rk9.events OR
-- limitless.tournaments OR trainers.gg (no source-schema parent). A single FK
-- column cannot reference two tables in two schemas, so we add TWO nullable FK
-- columns, each with ON DELETE CASCADE, and a CHECK enforcing exactly-one-set
-- by source. Deleting a parent event now cascades to its team_slots rows at the
-- database level — no explicit team_slots purge needed in the delete mutation.
--
-- The soft (source, event_key) linkage + idx_team_slots_source_event are kept:
-- the usage RPCs and the compile "already compiled?" check still use event_key.
-- These FK columns are additive (cascade only).
--
-- Backfill: existing rows carry source + event_key like 'rk9:TO027'. Strip the
-- 'rk9:'/'limitless:' prefix to recover the native parent id and set the
-- matching FK column. trainers.gg rows keep both columns null.
-- ============================================================================

-- 1. Add the two nullable FK columns (idempotent).
ALTER TABLE public.team_slots
  ADD COLUMN IF NOT EXISTS rk9_event_id text;
ALTER TABLE public.team_slots
  ADD COLUMN IF NOT EXISTS limitless_tournament_id text;

COMMENT ON COLUMN public.team_slots.rk9_event_id IS
  'FK to rk9.events(event_id) when source = ''rk9''; null otherwise. '
  'Drives ON DELETE CASCADE — deleting the rk9 event purges these slots.';
COMMENT ON COLUMN public.team_slots.limitless_tournament_id IS
  'FK to limitless.tournaments(tournament_id) when source = ''limitless''; null otherwise. '
  'Drives ON DELETE CASCADE — deleting the limitless tournament purges these slots.';

-- 2. Backfill existing rows from the soft (source, event_key) linkage.
--    event_key is source-qualified, e.g. 'rk9:TO027' / 'limitless:12345'.
--    substring(... from N) drops the 'rk9:' (4 chars) / 'limitless:' (10 chars) prefix.
-- Backfill from the soft (source, event_key) link. If a row has source='rk9'
-- but a malformed/NULL event_key it will be skipped here and then fail the
-- validating CHECK below — remediation is purge-and-reimport (data is re-importable).
UPDATE public.team_slots
  SET rk9_event_id = substring(event_key from 5)
  WHERE source = 'rk9'
    AND rk9_event_id IS NULL
    AND event_key LIKE 'rk9:%';

UPDATE public.team_slots
  SET limitless_tournament_id = substring(event_key from 11)
  WHERE source = 'limitless'
    AND limitless_tournament_id IS NULL
    AND event_key LIKE 'limitless:%';

-- 3. Add the FK constraints with ON DELETE CASCADE (idempotent via DROP/ADD).
--    NOT VALID would skip validation of existing rows; we WANT validation so a
--    bad backfill fails loudly. The table is empty in fresh replays and small
--    in practice (rk9/limitless data is re-importable), so a validating ADD is fine.
ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_rk9_event_fk;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_rk9_event_fk
  FOREIGN KEY (rk9_event_id) REFERENCES rk9.events (event_id) ON DELETE CASCADE;

ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_limitless_tournament_fk;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_limitless_tournament_fk
  FOREIGN KEY (limitless_tournament_id) REFERENCES limitless.tournaments (tournament_id) ON DELETE CASCADE;

-- 4. CHECK: exactly one FK set for rk9/limitless rows; both null for trainers.gg.
-- Coupled with team_slots_source_check (from the create-team_slots migration):
-- adding a new source value requires updating BOTH constraints.
ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_source_fk_check;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_source_fk_check
  CHECK (
    (source = 'rk9'         AND rk9_event_id IS NOT NULL AND limitless_tournament_id IS NULL)
    OR (source = 'limitless' AND limitless_tournament_id IS NOT NULL AND rk9_event_id IS NULL)
    OR (source = 'trainers.gg' AND rk9_event_id IS NULL AND limitless_tournament_id IS NULL)
  );

-- 5. Index the FK columns. Postgres does NOT auto-index FK columns, and the
--    cascade delete + future joins scan them. Partial indexes keep them small
--    (only the rows where the column is set).
CREATE INDEX IF NOT EXISTS idx_team_slots_rk9_event
  ON public.team_slots (rk9_event_id)
  WHERE rk9_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_slots_limitless_tournament
  ON public.team_slots (limitless_tournament_id)
  WHERE limitless_tournament_id IS NOT NULL;
