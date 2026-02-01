-- =============================================================================
-- 05_invitations.sql - Create Organization Invitations
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 04_organizations.sql (organizations must exist)
-- Creates pending invitations for testing notification system
-- =============================================================================

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
BEGIN
  -- Look up org IDs by slug
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';

  -- Exit if orgs don't exist
  IF vgc_league_id IS NULL OR pallet_town_id IS NULL THEN
    RAISE NOTICE 'Organizations not found, skipping invitation creation';
    RETURN;
  END IF;

  -- Create pending invitations (idempotent via unique constraint on org_id + invited_user_id)
  INSERT INTO public.organization_invitations (
    organization_id, invited_user_id, invited_by_user_id, status, expires_at
  ) VALUES
    -- VGC League invites Brock (pending) - Admin invites
    (vgc_league_id, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'pending', NOW() + INTERVAL '7 days'),
    -- VGC League invites Karen (pending) - Admin invites
    (vgc_league_id, 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'pending', NOW() + INTERVAL '7 days'),
    -- Pallet Town invites Brock (pending) - Ash invites
    (pallet_town_id, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'pending', NOW() + INTERVAL '14 days'),
    -- VGC League invited Red (expired example)
    (vgc_league_id, 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'expired', NOW() - INTERVAL '1 day'),
    -- Pallet Town invited Cynthia (declined example)
    (pallet_town_id, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'declined', NOW() + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;
END $$;
