-- =============================================================================
-- Migration: Rename organization roles to snake_case
-- =============================================================================
-- Changes:
--   - Renames all organization-scoped roles to snake_case for consistency
--   - "Owner" -> "owner"
--   - "Admin" -> "admin"
--   - "Moderator" -> "moderator"
--   - "Tournament Organizer" -> "tournament_organizer"
--   - "Judge" -> "judge"
--   - "Member" -> "member"
-- =============================================================================

-- Rename organization-scoped roles to snake_case
UPDATE public.roles SET name = 'owner' WHERE name = 'Owner' AND scope = 'organization';
UPDATE public.roles SET name = 'admin' WHERE name = 'Admin' AND scope = 'organization';
UPDATE public.roles SET name = 'moderator' WHERE name = 'Moderator' AND scope = 'organization';
UPDATE public.roles SET name = 'tournament_organizer' WHERE name = 'Tournament Organizer' AND scope = 'organization';
UPDATE public.roles SET name = 'judge' WHERE name = 'Judge' AND scope = 'organization';
UPDATE public.roles SET name = 'member' WHERE name = 'Member' AND scope = 'organization';
