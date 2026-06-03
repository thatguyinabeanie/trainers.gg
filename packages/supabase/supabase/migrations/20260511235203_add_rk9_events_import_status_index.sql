-- Partial index for RK9 cron worker's most common status queries:
--   SELECT ... FROM rk9.events WHERE import_status = 'pending' ORDER BY date_start
--   SELECT ... FROM rk9.events WHERE import_status IN ('roster','teams') ORDER BY date_start
-- Without this, the cron worker scans the full table on every 5-minute tick.

CREATE INDEX IF NOT EXISTS idx_rk9_events_import_status_date_start
  ON rk9.events (date_start ASC)
  WHERE import_status IN ('pending', 'roster', 'teams');
