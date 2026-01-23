-- =============================================================================
-- Migration: Add org_ prefix to organization-scoped roles and remove member
-- =============================================================================
-- Changes:
--   - Adds org_ prefix to all organization-scoped roles for clarity
--   - Removes the 'member' role (players register for tournaments, not orgs)
-- =============================================================================

-- Rename organization roles to use org_ prefix
UPDATE public.roles SET name = 'org_owner' WHERE name = 'owner' AND scope = 'organization';
UPDATE public.roles SET name = 'org_admin' WHERE name = 'admin' AND scope = 'organization';
UPDATE public.roles SET name = 'org_moderator' WHERE name = 'moderator' AND scope = 'organization';
UPDATE public.roles SET name = 'org_tournament_organizer' WHERE name = 'tournament_organizer' AND scope = 'organization';
UPDATE public.roles SET name = 'org_judge' WHERE name = 'judge' AND scope = 'organization';

-- Delete the member role (players register for tournaments, they don't "belong" to orgs)
DELETE FROM public.roles WHERE name = 'member' AND scope = 'organization';
