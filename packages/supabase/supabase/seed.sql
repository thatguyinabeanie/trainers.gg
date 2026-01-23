-- =============================================================================
-- trainers.gg Local Development Seed Data
-- =============================================================================
-- This file creates test data for local development.
-- It runs automatically after migrations via `supabase db reset`.
--
-- IMPORTANT: This file should NEVER be used in production.
-- =============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
   NOW(), NOW(), '', '', '', '');

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
   NOW(), NOW(), NOW());

-- -----------------------------------------------------------------------------
-- Update users/alts with additional data (trigger created basic records)
-- -----------------------------------------------------------------------------

UPDATE public.users SET
  birth_date = '1990-01-15', country = 'US'
WHERE id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

UPDATE public.users SET
  birth_date = '1997-05-22', country = 'JP'
WHERE id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

UPDATE public.users SET
  birth_date = '1985-07-10', country = 'JP'
WHERE id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

UPDATE public.users SET
  birth_date = '1992-03-08', country = 'JP'
WHERE id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';

UPDATE public.users SET
  birth_date = '1988-11-30', country = 'JP'
WHERE id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';

UPDATE public.users SET
  birth_date = '1996-08-27', country = 'JP'
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
-- All remaining data uses auto-increment bigint IDs
-- We use DO blocks to look up IDs dynamically
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  -- Alt IDs (bigint, auto-generated by trigger)
  admin_alt_id bigint;
  ash_alt_id bigint;
  cynthia_alt_id bigint;
  brock_alt_id bigint;
  karen_alt_id bigint;
  red_alt_id bigint;
  
  -- Organization IDs (bigint)
  vgc_league_id bigint;
  pallet_town_id bigint;
  sinnoh_champs_id bigint;
  
  -- Pokemon IDs (bigint)
  pika_id bigint;
  charizard_id bigint;
  greninja_id bigint;
  lucario_ash_id bigint;
  dragonite_id bigint;
  snorlax_id bigint;
  garchomp_id bigint;
  spiritomb_id bigint;
  lucario_cynthia_id bigint;
  togekiss_id bigint;
  milotic_id bigint;
  roserade_id bigint;
  flutter_id bigint;
  koraidon_id bigint;
  miraidon_id bigint;
  rillaboom_id bigint;
  incineroar_id bigint;
  amoonguss_id bigint;
  
  -- Team IDs (bigint)
  kanto_team_id bigint;
  sinnoh_team_id bigint;
  meta_team_id bigint;
  
  -- Tournament IDs (bigint)
  weekly_id bigint;
  monthly_id bigint;
  regional_id bigint;
  friendly_id bigint;
  
  -- Role IDs (bigint)
  site_admin_role_id bigint;
  owner_role_id bigint;
  admin_role_id bigint;
  mod_role_id bigint;
  to_role_id bigint;
  judge_role_id bigint;
  member_role_id bigint;
  
  -- Permission IDs (bigint)
  perm_org_manage bigint;
  perm_members_manage bigint;
  perm_tournament_create bigint;
  perm_tournament_manage bigint;
  perm_tournament_judge bigint;
  perm_content_mod bigint;

BEGIN
  -- Get alt IDs created by trigger
  SELECT id INTO admin_alt_id FROM public.alts WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  SELECT id INTO ash_alt_id FROM public.alts WHERE user_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  SELECT id INTO cynthia_alt_id FROM public.alts WHERE user_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';
  SELECT id INTO brock_alt_id FROM public.alts WHERE user_id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';
  SELECT id INTO karen_alt_id FROM public.alts WHERE user_id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';
  SELECT id INTO red_alt_id FROM public.alts WHERE user_id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

  -- ==========================================================================
  -- Site Admin Role Assignment
  -- ==========================================================================
  
  -- Get the site_admin role ID (created by migration)
  SELECT id INTO site_admin_role_id FROM public.roles WHERE name = 'site_admin' AND scope = 'site';
  
  -- Grant site_admin role to admin user
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', site_admin_role_id);

  -- ==========================================================================
  -- Organizations
  -- ==========================================================================
  
  INSERT INTO public.organizations (
    name, slug, description, status, owner_alt_id, tier, subscription_tier,
    discord_url, twitter_url, website_url
  ) VALUES (
    'VGC League', 'vgc-league',
    'Premier Pokemon VGC tournament organization. Weekly locals and monthly championships.',
    'active', admin_alt_id, 'partner', 'organization_plus',
    'https://discord.gg/vgcleague', 'https://twitter.com/vgcleague', 'https://vgcleague.com'
  ) RETURNING id INTO vgc_league_id;
  
  INSERT INTO public.organizations (
    name, slug, description, status, owner_alt_id, tier, subscription_tier,
    discord_url, twitter_url, website_url
  ) VALUES (
    'Pallet Town Trainers', 'pallet-town',
    'A friendly community for trainers from Pallet Town and beyond. Casual and competitive events.',
    'active', ash_alt_id, 'regular', 'free',
    NULL, NULL, NULL
  ) RETURNING id INTO pallet_town_id;
  
  INSERT INTO public.organizations (
    name, slug, description, status, owner_alt_id, tier, subscription_tier,
    discord_url, twitter_url, website_url
  ) VALUES (
    'Sinnoh Champions', 'sinnoh-champions',
    'Elite tournament series for Sinnoh region trainers. High-level competitive play.',
    'active', cynthia_alt_id, 'verified', 'organization_plus',
    'https://discord.gg/sinnoh', NULL, NULL
  ) RETURNING id INTO sinnoh_champs_id;

  -- Organization members
  INSERT INTO public.organization_members (organization_id, alt_id) VALUES
    (vgc_league_id, admin_alt_id),
    (vgc_league_id, ash_alt_id),
    (vgc_league_id, cynthia_alt_id),
    (pallet_town_id, ash_alt_id),
    (pallet_town_id, admin_alt_id),
    (sinnoh_champs_id, cynthia_alt_id),
    (sinnoh_champs_id, admin_alt_id);

  -- ==========================================================================
  -- Pokemon
  -- ==========================================================================
  
  -- Ash's Team
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Pikachu', 'Pika', 'Timid', 'Static', 'Light Ball', 'Male', false, 'Thunderbolt', 'Volt Tackle', 'Iron Tail', 'Quick Attack', 0, 0, 0, 252, 4, 252, 'Electric')
  RETURNING id INTO pika_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Charizard', NULL, 'Timid', 'Solar Power', 'Choice Specs', 'Male', false, 'Heat Wave', 'Air Slash', 'Dragon Pulse', 'Protect', 0, 0, 0, 252, 4, 252, 'Fire')
  RETURNING id INTO charizard_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Greninja', NULL, 'Timid', 'Protean', 'Focus Sash', 'Male', false, 'Hydro Pump', 'Ice Beam', 'Dark Pulse', 'Protect', 0, 0, 0, 252, 4, 252, 'Water')
  RETURNING id INTO greninja_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Lucario', NULL, 'Jolly', 'Inner Focus', 'Life Orb', 'Male', false, 'Close Combat', 'Extreme Speed', 'Bullet Punch', 'Swords Dance', 0, 252, 0, 0, 4, 252, 'Fighting')
  RETURNING id INTO lucario_ash_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Dragonite', NULL, 'Adamant', 'Multiscale', 'Leftovers', 'Male', false, 'Dragon Dance', 'Outrage', 'Extreme Speed', 'Earthquake', 252, 252, 0, 0, 4, 0, 'Normal')
  RETURNING id INTO dragonite_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Snorlax', NULL, 'Careful', 'Thick Fat', 'Leftovers', 'Male', false, 'Body Slam', 'Crunch', 'Curse', 'Rest', 252, 0, 0, 0, 252, 4, 'Normal')
  RETURNING id INTO snorlax_id;

  -- Cynthia's Team
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Garchomp', NULL, 'Jolly', 'Rough Skin', 'Rocky Helmet', 'Female', false, 'Earthquake', 'Dragon Claw', 'Swords Dance', 'Protect', 0, 252, 0, 0, 4, 252, 'Ground')
  RETURNING id INTO garchomp_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Spiritomb', NULL, 'Bold', 'Pressure', 'Sitrus Berry', 'Female', false, 'Shadow Ball', 'Dark Pulse', 'Will-O-Wisp', 'Pain Split', 252, 0, 252, 0, 4, 0, 'Ghost')
  RETURNING id INTO spiritomb_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Lucario', NULL, 'Modest', 'Steadfast', 'Choice Specs', 'Male', false, 'Aura Sphere', 'Flash Cannon', 'Vacuum Wave', 'Dragon Pulse', 0, 0, 0, 252, 4, 252, 'Steel')
  RETURNING id INTO lucario_cynthia_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Togekiss', NULL, 'Timid', 'Serene Grace', 'Scope Lens', 'Female', false, 'Air Slash', 'Dazzling Gleam', 'Follow Me', 'Protect', 252, 0, 0, 252, 4, 0, 'Fairy')
  RETURNING id INTO togekiss_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Milotic', NULL, 'Bold', 'Marvel Scale', 'Flame Orb', 'Female', false, 'Scald', 'Ice Beam', 'Recover', 'Protect', 252, 0, 252, 0, 4, 0, 'Water')
  RETURNING id INTO milotic_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Roserade', NULL, 'Timid', 'Natural Cure', 'Focus Sash', 'Female', false, 'Leaf Storm', 'Sludge Bomb', 'Sleep Powder', 'Protect', 0, 0, 0, 252, 4, 252, 'Grass')
  RETURNING id INTO roserade_id;

  -- Meta Pokemon (Reg G)
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Flutter Mane', NULL, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false, 'Shadow Ball', 'Moonblast', 'Dazzling Gleam', 'Protect', 0, 0, 0, 252, 4, 252, 'Fairy')
  RETURNING id INTO flutter_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Koraidon', NULL, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false, 'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect', 0, 252, 0, 0, 4, 252, 'Fighting')
  RETURNING id INTO koraidon_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Miraidon', NULL, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false, 'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Thunder', 0, 0, 0, 252, 4, 252, 'Electric')
  RETURNING id INTO miraidon_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Rillaboom', NULL, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false, 'Grassy Glide', 'Wood Hammer', 'U-turn', 'Fake Out', 252, 252, 0, 0, 4, 0, 'Grass')
  RETURNING id INTO rillaboom_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Incineroar', NULL, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false, 'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot', 252, 0, 0, 0, 252, 4, 'Dark')
  RETURNING id INTO incineroar_id;
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Amoonguss', NULL, 'Relaxed', 'Regenerator', 'Rocky Helmet', NULL, false, 'Spore', 'Pollen Puff', 'Rage Powder', 'Protect', 252, 0, 252, 0, 4, 0, 'Grass')
  RETURNING id INTO amoonguss_id;

  -- ==========================================================================
  -- Teams
  -- ==========================================================================
  
  INSERT INTO public.teams (name, description, created_by, is_public, tags, notes)
  VALUES ('Kanto Classics', 'My journey team, now VGC ready!', ash_alt_id, true, ARRAY['VGC', 'Kanto', 'Offensive'], 'Featured on stream at Worlds 2024')
  RETURNING id INTO kanto_team_id;
  
  INSERT INTO public.teams (name, description, created_by, is_public, tags, notes)
  VALUES ('Sinnoh Elite', 'Championship team - balanced offense and defense', cynthia_alt_id, true, ARRAY['VGC', 'Sinnoh', 'Balance'], 'Undefeated at Sinnoh Regionals')
  RETURNING id INTO sinnoh_team_id;
  
  INSERT INTO public.teams (name, description, created_by, is_public, tags, notes)
  VALUES ('Regulation G Meta', 'Current meta sample team for testing', admin_alt_id, true, ARRAY['VGC', 'Reg G', 'Meta'], 'Sample team for local testing')
  RETURNING id INTO meta_team_id;

  -- Link Pokemon to Teams
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position) VALUES
    (kanto_team_id, pika_id, 1),
    (kanto_team_id, charizard_id, 2),
    (kanto_team_id, greninja_id, 3),
    (kanto_team_id, lucario_ash_id, 4),
    (kanto_team_id, dragonite_id, 5),
    (kanto_team_id, snorlax_id, 6),
    (sinnoh_team_id, garchomp_id, 1),
    (sinnoh_team_id, spiritomb_id, 2),
    (sinnoh_team_id, lucario_cynthia_id, 3),
    (sinnoh_team_id, togekiss_id, 4),
    (sinnoh_team_id, milotic_id, 5),
    (sinnoh_team_id, roserade_id, 6),
    (meta_team_id, flutter_id, 1),
    (meta_team_id, koraidon_id, 2),
    (meta_team_id, miraidon_id, 3),
    (meta_team_id, rillaboom_id, 4),
    (meta_team_id, incineroar_id, 5),
    (meta_team_id, amoonguss_id, 6);

  -- ==========================================================================
  -- Tournaments
  -- ==========================================================================
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC Weekly #42', 'vgc-weekly-42',
    'Weekly VGC tournament. Bo3 Swiss into Top 8 cut.',
    'VGC Regulation G', 'upcoming',
    NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '6 hours',
    NOW() + INTERVAL '2 days', 32,
    'swiss_with_cut', 5, 50, false, NULL
  ) RETURNING id INTO weekly_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC Monthly Championship', 'vgc-monthly-jan',
    'Monthly championship series. Top 8 earns Championship Points!',
    'VGC Regulation G', 'active',
    NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours',
    NOW() - INTERVAL '1 day', 64,
    'swiss_with_cut', 6, 50, true, 8
  ) RETURNING id INTO monthly_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champs_id, 'Sinnoh Regional Qualifier', 'sinnoh-regional-q1',
    'Qualify for the Sinnoh Regional Championship!',
    'VGC Regulation G', 'completed',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '8 hours',
    NOW() - INTERVAL '8 days', 128,
    'swiss_with_cut', 7, 50, false, NULL
  ) RETURNING id INTO regional_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Friendly', 'pallet-friendly-feb',
    'Casual tournament for beginners and experienced players alike!',
    'VGC Regulation G', 'draft',
    NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
    NOW() + INTERVAL '13 days', 16,
    'swiss_only', NULL, 50, false, NULL
  ) RETURNING id INTO friendly_id;

  -- ==========================================================================
  -- Tournament Registrations
  -- ==========================================================================
  
  -- Registrations for upcoming tournament (Weekly #42)
  INSERT INTO public.tournament_registrations (tournament_id, alt_id, status, team_name) VALUES
    (weekly_id, ash_alt_id, 'registered', 'Kanto Classics'),
    (weekly_id, cynthia_alt_id, 'registered', 'Sinnoh Elite'),
    (weekly_id, brock_alt_id, 'registered', NULL),
    (weekly_id, karen_alt_id, 'pending', NULL);

  -- Registrations for active tournament (Monthly Championship)
  INSERT INTO public.tournament_registrations (tournament_id, alt_id, status, team_name, checked_in_at) VALUES
    (monthly_id, ash_alt_id, 'checked_in', 'Kanto Classics', NOW() - INTERVAL '3 hours'),
    (monthly_id, cynthia_alt_id, 'checked_in', 'Sinnoh Elite', NOW() - INTERVAL '2 hours'),
    (monthly_id, brock_alt_id, 'checked_in', NULL, NOW() - INTERVAL '2 hours'),
    (monthly_id, karen_alt_id, 'checked_in', NULL, NOW() - INTERVAL '1 hour'),
    (monthly_id, red_alt_id, 'checked_in', NULL, NOW() - INTERVAL '30 minutes');

  -- ==========================================================================
  -- Organization Roles and Permissions (scope = 'organization')
  -- ==========================================================================
  
  INSERT INTO public.roles (name, description, scope) VALUES ('owner', 'Full control over the organization', 'organization') RETURNING id INTO owner_role_id;
  INSERT INTO public.roles (name, description, scope) VALUES ('admin', 'Administrative privileges', 'organization') RETURNING id INTO admin_role_id;
  INSERT INTO public.roles (name, description, scope) VALUES ('moderator', 'Can moderate content and users', 'organization') RETURNING id INTO mod_role_id;
  INSERT INTO public.roles (name, description, scope) VALUES ('tournament_organizer', 'Can create and manage tournaments', 'organization') RETURNING id INTO to_role_id;
  INSERT INTO public.roles (name, description, scope) VALUES ('judge', 'Can resolve match disputes', 'organization') RETURNING id INTO judge_role_id;
  INSERT INTO public.roles (name, description, scope) VALUES ('member', 'Basic member access', 'organization') RETURNING id INTO member_role_id;

  INSERT INTO public.permissions (key, name, description) VALUES ('org.manage', 'Manage Organization', 'Can modify organization settings') RETURNING id INTO perm_org_manage;
  INSERT INTO public.permissions (key, name, description) VALUES ('org.members.manage', 'Manage Members', 'Can add/remove organization members') RETURNING id INTO perm_members_manage;
  INSERT INTO public.permissions (key, name, description) VALUES ('tournament.create', 'Create Tournament', 'Can create new tournaments') RETURNING id INTO perm_tournament_create;
  INSERT INTO public.permissions (key, name, description) VALUES ('tournament.manage', 'Manage Tournament', 'Can edit and manage tournaments') RETURNING id INTO perm_tournament_manage;
  INSERT INTO public.permissions (key, name, description) VALUES ('tournament.judge', 'Judge Matches', 'Can resolve match disputes') RETURNING id INTO perm_tournament_judge;
  INSERT INTO public.permissions (key, name, description) VALUES ('content.moderate', 'Moderate Content', 'Can moderate user content') RETURNING id INTO perm_content_mod;

  -- Link permissions to roles
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    -- Owner gets everything
    (owner_role_id, perm_org_manage),
    (owner_role_id, perm_members_manage),
    (owner_role_id, perm_tournament_create),
    (owner_role_id, perm_tournament_manage),
    (owner_role_id, perm_tournament_judge),
    (owner_role_id, perm_content_mod),
    -- Admin gets most things
    (admin_role_id, perm_members_manage),
    (admin_role_id, perm_tournament_create),
    (admin_role_id, perm_tournament_manage),
    (admin_role_id, perm_tournament_judge),
    (admin_role_id, perm_content_mod),
    -- Moderator
    (mod_role_id, perm_content_mod),
    -- Tournament Organizer
    (to_role_id, perm_tournament_create),
    (to_role_id, perm_tournament_manage),
    -- Judge
    (judge_role_id, perm_tournament_judge);

END $$;

-- =============================================================================
-- Seed Complete
-- =============================================================================
-- 
-- Test Accounts (all use password: password123)
-- 
-- | Email                    | Username       | Role             |
-- |--------------------------|----------------|------------------|
-- | admin@trainers.local     | admin_trainer  | site_admin       |
-- | player@trainers.local    | ash_ketchum    | Player Pro       |
-- | champion@trainers.local  | cynthia        | Player Pro       |
-- | gymleader@trainers.local | brock          | Regular          |
-- | elite@trainers.local     | karen          | Regular          |
-- | casual@trainers.local    | red            | Regular          |
--
-- Organizations:
-- - VGC League (partner tier, org_plus subscription)
-- - Pallet Town Trainers (regular tier, free)
-- - Sinnoh Champions (verified tier, org_plus subscription)
--
-- Tournaments:
-- - VGC Weekly #42 (upcoming)
-- - VGC Monthly Championship (active)
-- - Sinnoh Regional Qualifier (completed)
-- - Pallet Town Friendly (draft)
--
-- All IDs are now auto-generated bigint (except users.id which is uuid)
-- =============================================================================
