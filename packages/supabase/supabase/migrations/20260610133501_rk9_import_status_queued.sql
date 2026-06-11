-- Add 'queued' to the RK9 import lifecycle: admin queues an event; the
-- background worker (Vercel cron) advances queued → roster → teams → complete.
--
-- This must be its own migration file: a new enum value cannot be USED in the
-- same transaction that adds it (the partial index in the follow-up migration
-- references 'queued'). Never write rows with 'queued' in this migration.
ALTER TYPE rk9.import_status ADD VALUE IF NOT EXISTS 'queued';
