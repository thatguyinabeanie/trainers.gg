-- =============================================================================
-- 07_teams.sql - Create Teams and Link Pokemon
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- Depends on: 03_users.sql (alts must exist), 06_pokemon.sql (pokemon must exist)
-- =============================================================================

DO $$
DECLARE
  -- Alt IDs
  admin_alt_id bigint;
  ash_alt_id bigint;
  cynthia_alt_id bigint;
  
  -- Pokemon IDs
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
  
  -- Team IDs
  kanto_team_id bigint;
  sinnoh_team_id bigint;
  meta_team_id bigint;
  
  -- Check flag
  teams_exist boolean;
BEGIN
  -- Check if teams already exist
  SELECT EXISTS(
    SELECT 1 FROM public.teams WHERE name = 'Kanto Classics'
  ) INTO teams_exist;
  
  IF teams_exist THEN
    RAISE NOTICE 'Teams already exist, skipping';
    RETURN;
  END IF;

  -- Get alt IDs
  SELECT id INTO admin_alt_id FROM public.alts WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  SELECT id INTO ash_alt_id FROM public.alts WHERE user_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  SELECT id INTO cynthia_alt_id FROM public.alts WHERE user_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';
  
  IF ash_alt_id IS NULL THEN
    RAISE NOTICE 'Alts not found, skipping team creation';
    RETURN;
  END IF;

  -- Get Pokemon IDs by species/nickname
  SELECT id INTO pika_id FROM public.pokemon WHERE species = 'Pikachu' AND nickname = 'Pika' LIMIT 1;
  SELECT id INTO charizard_id FROM public.pokemon WHERE species = 'Charizard' AND nickname IS NULL LIMIT 1;
  SELECT id INTO greninja_id FROM public.pokemon WHERE species = 'Greninja' LIMIT 1;
  SELECT id INTO lucario_ash_id FROM public.pokemon WHERE species = 'Lucario' AND nickname = 'Ash-Lucario' LIMIT 1;
  SELECT id INTO dragonite_id FROM public.pokemon WHERE species = 'Dragonite' LIMIT 1;
  SELECT id INTO snorlax_id FROM public.pokemon WHERE species = 'Snorlax' LIMIT 1;
  SELECT id INTO garchomp_id FROM public.pokemon WHERE species = 'Garchomp' LIMIT 1;
  SELECT id INTO spiritomb_id FROM public.pokemon WHERE species = 'Spiritomb' LIMIT 1;
  SELECT id INTO lucario_cynthia_id FROM public.pokemon WHERE species = 'Lucario' AND nickname = 'Cynthia-Lucario' LIMIT 1;
  SELECT id INTO togekiss_id FROM public.pokemon WHERE species = 'Togekiss' LIMIT 1;
  SELECT id INTO milotic_id FROM public.pokemon WHERE species = 'Milotic' LIMIT 1;
  SELECT id INTO roserade_id FROM public.pokemon WHERE species = 'Roserade' LIMIT 1;
  SELECT id INTO flutter_id FROM public.pokemon WHERE species = 'Flutter Mane' LIMIT 1;
  SELECT id INTO koraidon_id FROM public.pokemon WHERE species = 'Koraidon' LIMIT 1;
  SELECT id INTO miraidon_id FROM public.pokemon WHERE species = 'Miraidon' LIMIT 1;
  SELECT id INTO rillaboom_id FROM public.pokemon WHERE species = 'Rillaboom' LIMIT 1;
  SELECT id INTO incineroar_id FROM public.pokemon WHERE species = 'Incineroar' LIMIT 1;
  SELECT id INTO amoonguss_id FROM public.pokemon WHERE species = 'Amoonguss' LIMIT 1;

  IF pika_id IS NULL THEN
    RAISE NOTICE 'Pokemon not found, skipping team creation';
    RETURN;
  END IF;

  -- Create teams
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

  RAISE NOTICE 'Teams created and linked to Pokemon successfully';
END $$;
