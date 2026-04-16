-- Adds a TTL timestamp on the users row so the UI can show a "your DMs
-- look closed from server members" warning when the bot has recently
-- tried to DM this user and hit Discord error 50007.
--
-- The notify cron sets this to `now() + interval '30 days'` on 50007
-- failure; successful DM delivery clears it to NULL. The UI banner is
-- visible while discord_dm_warn_until > now().

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS discord_dm_warn_until timestamptz;

-- Partial index — most users will have NULL, so keep the index narrow.
CREATE INDEX IF NOT EXISTS idx_users_discord_dm_warn_until_not_null
  ON public.users (id)
  WHERE discord_dm_warn_until IS NOT NULL;
