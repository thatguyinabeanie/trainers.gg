-- Add is_public column to alts table for player profile visibility.
-- When true, the alt is shown as a public identity chip on the player's profile.
-- Defaults to false so existing alts remain private until the user opts in.

ALTER TABLE public.alts
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN public.alts.is_public IS 'When true, this alt is visible on the user''s public player profile';
