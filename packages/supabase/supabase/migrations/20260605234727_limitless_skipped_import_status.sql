-- Add 'skipped' as a valid import_status for limitless.tournaments.
-- Used for tournaments whose Limitless format code is in SKIP_FORMATS
-- (e.g. "CUSTOM") — synced for visibility but never imported.
--
-- Also retroactively mark existing CUSTOM rows as skipped so they stop
-- sitting in the queue.

ALTER TABLE limitless.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_import_status_check;

ALTER TABLE limitless.tournaments
  ADD CONSTRAINT tournaments_import_status_check
  CHECK (import_status = ANY (ARRAY[
    'queued'::text,
    'importing'::text,
    'completed'::text,
    'failed'::text,
    'skipped'::text
  ]));

UPDATE limitless.tournaments
  SET import_status = 'skipped',
      import_error = 'Skipped: CUSTOM format'
  WHERE format_id = 'CUSTOM'
    AND import_status IN ('queued', 'failed');
