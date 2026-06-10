-- Queue bookkeeping for background RK9 imports (parity with limitless.tournaments):
--   import_requested_at — FIFO ordering of the queue
--   worker_claimed_at   — per-event lease; heartbeat per teams batch; stale after 10 min
--   import_attempts     — escalation counter; worker gives up at 3
ALTER TABLE rk9.events
  ADD COLUMN IF NOT EXISTS import_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_claimed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS import_attempts     int NOT NULL DEFAULT 0;

-- Partial index for the worker's pick query (queued/in-flight events only).
CREATE INDEX IF NOT EXISTS idx_rk9_events_queue_pick
  ON rk9.events (import_requested_at)
  WHERE import_status IN ('queued', 'roster', 'teams');
