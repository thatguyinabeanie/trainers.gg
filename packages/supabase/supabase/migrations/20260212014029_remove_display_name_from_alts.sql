-- Remove display_name column from alts table
--
-- Context: Alts should use the username (handle) as the primary identifier
-- for tournament registration. The display_name field adds unnecessary complexity
-- and confusion between username and display name.
--
-- This migration simplifies the alts table to use only username as the identifier,
-- which is shown as @username in the UI.

ALTER TABLE public.alts DROP COLUMN IF EXISTS display_name;
