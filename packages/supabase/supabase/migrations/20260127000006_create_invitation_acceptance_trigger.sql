-- Migration: Create invitation acceptance trigger
-- Description: Automatically creates organization_staff record when invitation is accepted
-- Date: 2026-01-27

-- =============================================================================
-- CREATE TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger AS $$
BEGIN
  -- Only act when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Verify invited_user_id is set
    IF NEW.invited_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot accept invitation: invited_user_id is NULL';
    END IF;

    -- Create organization_staff record
    -- Use ON CONFLICT DO NOTHING for idempotency (in case staff record already exists)
    INSERT INTO organization_staff (
      organization_id,
      user_id,
      created_at,
      updated_at
    )
    VALUES (
      NEW.organization_id,
      NEW.invited_user_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Assign the role from the invitation to the user
    -- First, get the permission group ID for the role
    INSERT INTO user_group_roles (
      user_id,
      group_id,
      organization_id,
      created_at,
      updated_at
    )
    SELECT 
      NEW.invited_user_id,
      pg.id,
      NEW.organization_id,
      NOW(),
      NOW()
    FROM permission_groups pg
    WHERE pg.key = NEW.role
    ON CONFLICT (user_id, group_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS on_invitation_accepted ON organization_invitations;

CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_acceptance();

-- =============================================================================
-- ADD COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.handle_invitation_acceptance() IS 
'Trigger function that automatically creates organization_staff record and assigns role when an invitation status changes to "accepted". 
Uses ON CONFLICT DO NOTHING for idempotency.';

COMMENT ON TRIGGER on_invitation_accepted ON organization_invitations IS 
'Automatically creates organization_staff record and assigns role when invitation is accepted';
