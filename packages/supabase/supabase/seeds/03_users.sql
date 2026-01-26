-- =============================================================================
-- 03_users.sql - Create Test Users and Profiles
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING for inserts, UPDATE for profile data
-- Creates auth.users entries which trigger creation of public.users and alts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Test Users (via auth.users - trigger creates public.users + alts)
-- -----------------------------------------------------------------------------
-- Users use distinct UUIDs for easy identification

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data, 
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '00000000-0000-0000-0000-000000000000',
   'admin@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "admin_trainer", "first_name": "Admin", "last_name": "Trainer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '00000000-0000-0000-0000-000000000000',
   'player@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "ash_ketchum", "first_name": "Ash", "last_name": "Ketchum"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', '00000000-0000-0000-0000-000000000000',
   'champion@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "cynthia", "first_name": "Cynthia", "last_name": "Shirona"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', '00000000-0000-0000-0000-000000000000',
   'gymleader@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "brock", "first_name": "Brock", "last_name": "Harrison"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', '00000000-0000-0000-0000-000000000000',
   'elite@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "karen", "first_name": "Karen", "last_name": "Elite"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', '00000000-0000-0000-0000-000000000000',
   'casual@trainers.local', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username": "red", "first_name": "Red", "last_name": "Champion"}'::jsonb,
   NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Auth Identities (required for email/password login)
-- -----------------------------------------------------------------------------

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'email',
   '{"sub": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d", "email": "admin@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW()),
  
  (gen_random_uuid(), 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'email',
   '{"sub": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e", "email": "player@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW()),
  
  (gen_random_uuid(), 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'email',
   '{"sub": "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f", "email": "champion@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW()),
  
  (gen_random_uuid(), 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'email',
   '{"sub": "d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a", "email": "gymleader@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW()),
  
  (gen_random_uuid(), 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'email',
   '{"sub": "e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b", "email": "elite@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW()),
  
  (gen_random_uuid(), 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'email',
   '{"sub": "f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c", "email": "casual@trainers.local", "email_verified": true}'::jsonb,
   NOW(), NOW(), NOW())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Update users/alts with additional data (trigger created basic records)
-- -----------------------------------------------------------------------------
-- Note: pds_handle is auto-generated by trigger from username
-- DIDs are sample values for local development (not real AT Protocol DIDs)
-- These UPDATEs are idempotent - they set the same values each time

UPDATE public.users SET
  birth_date = '1990-01-15', country = 'US',
  did = 'did:plc:admin0000000000000000000', pds_status = 'active'
WHERE id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

UPDATE public.users SET
  birth_date = '1997-05-22', country = 'JP',
  did = 'did:plc:ash00000000000000000000', pds_status = 'active'
WHERE id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

UPDATE public.users SET
  birth_date = '1985-07-10', country = 'JP',
  did = 'did:plc:cynthia000000000000000', pds_status = 'active'
WHERE id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

UPDATE public.users SET
  birth_date = '1992-03-08', country = 'JP',
  did = 'did:plc:brock0000000000000000000', pds_status = 'active'
WHERE id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';

UPDATE public.users SET
  birth_date = '1988-11-30', country = 'JP',
  did = 'did:plc:karen0000000000000000000', pds_status = 'active'
WHERE id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';

UPDATE public.users SET
  birth_date = '1996-08-27', country = 'JP',
  did = 'did:plc:red000000000000000000000', pds_status = 'active'
WHERE id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

-- Update alts with bios and tiers
UPDATE public.alts SET
  bio = 'Platform administrator and VGC enthusiast. Organizing tournaments since 2015.'
WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

UPDATE public.alts SET
  bio = 'Gotta catch em all! On my journey to become a Pokemon Master.',
  tier = 'player_pro'
WHERE user_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

UPDATE public.alts SET
  bio = 'Sinnoh Champion. I believe the bonds we share with Pokemon lead to true strength.',
  tier = 'player_pro'
WHERE user_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

UPDATE public.alts SET
  bio = 'Pewter City Gym Leader. Rock-type specialist and Pokemon Breeder.'
WHERE user_id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';

UPDATE public.alts SET
  bio = 'Elite Four member. Strong Pokemon. Weak Pokemon. That is only the selfish perception of people.'
WHERE user_id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';

UPDATE public.alts SET
  bio = '...'
WHERE user_id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

-- -----------------------------------------------------------------------------
-- Grant Site Admin Role to Admin User
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  site_admin_role_id bigint;
BEGIN
  -- Get the Site Admin role ID
  SELECT id INTO site_admin_role_id FROM public.roles WHERE name = 'Site Admin' AND scope = 'site';
  
  -- Grant Site Admin role to admin user (idempotent with ON CONFLICT)
  IF site_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES
      ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', site_admin_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
