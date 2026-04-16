-- Add created_at timestamp to discord_dm_settings for audit/ordering consistency.

ALTER TABLE public.discord_dm_settings
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
