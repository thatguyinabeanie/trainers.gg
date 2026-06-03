-- =============================================================================
-- 09_teams.sql - Create Teams, Pokemon, and Team-Pokemon Links
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-03T01:10:30.373Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql
-- =============================================================================

DO $$
DECLARE
  teams_exist boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.teams LIMIT 1) INTO teams_exist;
  IF teams_exist THEN
    RAISE NOTICE 'Teams already exist, skipping';
    RETURN;
  END IF;

  -- Insert teams
  INSERT INTO public.teams (name, created_by, is_public) VALUES
    ('team-seed-1', (SELECT a.id FROM public.alts a WHERE a.username = 'khalillarson_schuppe'), false),
    ('team-seed-2', (SELECT a.id FROM public.alts a WHERE a.username = 'firsthand_gym'), false),
    ('team-seed-3', (SELECT a.id FROM public.alts a WHERE a.username = 'dominic_kuphal'), false),
    ('team-seed-4', (SELECT a.id FROM public.alts a WHERE a.username = 'woeful_trainer_243'), false),
    ('team-seed-5', (SELECT a.id FROM public.alts a WHERE a.username = 'pertinent_trainer_27'), false),
    ('team-seed-6', (SELECT a.id FROM public.alts a WHERE a.username = 'alyson_stiedemann'), false),
    ('team-seed-7', (SELECT a.id FROM public.alts a WHERE a.username = 'diamond_kunze75'), false),
    ('team-seed-8', (SELECT a.id FROM public.alts a WHERE a.username = 'ash_ketchum'), false),
    ('team-seed-9', (SELECT a.id FROM public.alts a WHERE a.username = 'joshweimann33'), false),
    ('team-seed-10', (SELECT a.id FROM public.alts a WHERE a.username = 'clint_denesik'), false),
    ('team-seed-11', (SELECT a.id FROM public.alts a WHERE a.username = 'oswaldo_kling'), false),
    ('team-seed-12', (SELECT a.id FROM public.alts a WHERE a.username = 'annette20'), false),
    ('team-seed-13', (SELECT a.id FROM public.alts a WHERE a.username = 'multicolored_champio'), false),
    ('team-seed-14', (SELECT a.id FROM public.alts a WHERE a.username = 'alvertalemke46'), false),
    ('team-seed-15', (SELECT a.id FROM public.alts a WHERE a.username = 'rey_bode55'), false),
    ('team-seed-16', (SELECT a.id FROM public.alts a WHERE a.username = 'valentinaklocko65'), false),
    ('team-seed-17', (SELECT a.id FROM public.alts a WHERE a.username = 'bowed_ace'), false),
    ('team-seed-18', (SELECT a.id FROM public.alts a WHERE a.username = 'jailyn75'), false),
    ('team-seed-19', (SELECT a.id FROM public.alts a WHERE a.username = 'cooperative_trainer_'), false),
    ('team-seed-20', (SELECT a.id FROM public.alts a WHERE a.username = 'trusty_gym'), false),
    ('team-seed-21', (SELECT a.id FROM public.alts a WHERE a.username = 'houston_walter'), false),
    ('team-seed-22', (SELECT a.id FROM public.alts a WHERE a.username = 'marilie_medhurst82'), false),
    ('team-seed-23', (SELECT a.id FROM public.alts a WHERE a.username = 'cristobalupton55'), false),
    ('team-seed-24', (SELECT a.id FROM public.alts a WHERE a.username = 'enlightened_trainer_'), false),
    ('team-seed-25', (SELECT a.id FROM public.alts a WHERE a.username = 'marianamitchell71'), false),
    ('team-seed-26', (SELECT a.id FROM public.alts a WHERE a.username = 'kamron_kemmer91'), false),
    ('team-seed-27', (SELECT a.id FROM public.alts a WHERE a.username = 'made_up_trainer_161'), false),
    ('team-seed-28', (SELECT a.id FROM public.alts a WHERE a.username = 'bart74'), false),
    ('team-seed-29', (SELECT a.id FROM public.alts a WHERE a.username = 'kasey_jacobi99'), false),
    ('team-seed-30', (SELECT a.id FROM public.alts a WHERE a.username = 'marquis78'), false),
    ('team-seed-31', (SELECT a.id FROM public.alts a WHERE a.username = 'richardswaniawski20'), false),
    ('team-seed-32', (SELECT a.id FROM public.alts a WHERE a.username = 'shaylee16'), false),
    ('team-seed-33', (SELECT a.id FROM public.alts a WHERE a.username = 'frozen_trainer_101'), false),
    ('team-seed-34', (SELECT a.id FROM public.alts a WHERE a.username = 'nolanlangosh54'), false),
    ('team-seed-35', (SELECT a.id FROM public.alts a WHERE a.username = 'maiyaabshire82'), false),
    ('team-seed-36', (SELECT a.id FROM public.alts a WHERE a.username = 'purple_champion'), false),
    ('team-seed-37', (SELECT a.id FROM public.alts a WHERE a.username = 'impossible_trainer_9'), false),
    ('team-seed-38', (SELECT a.id FROM public.alts a WHERE a.username = 'faraway_master'), false),
    ('team-seed-39', (SELECT a.id FROM public.alts a WHERE a.username = 'dim_trainer_491'), false),
    ('team-seed-40', (SELECT a.id FROM public.alts a WHERE a.username = 'trentheaney20'), false),
    ('team-seed-41', (SELECT a.id FROM public.alts a WHERE a.username = 'oleflatley25'), false),
    ('team-seed-42', (SELECT a.id FROM public.alts a WHERE a.username = 'eryn_stracke_hand41'), false),
    ('team-seed-43', (SELECT a.id FROM public.alts a WHERE a.username = 'dirty_trainer_951'), false),
    ('team-seed-44', (SELECT a.id FROM public.alts a WHERE a.username = 'sincere98'), false),
    ('team-seed-45', (SELECT a.id FROM public.alts a WHERE a.username = 'quick_witted_leader'), false),
    ('team-seed-46', (SELECT a.id FROM public.alts a WHERE a.username = 'woeful_trainer_243'), false),
    ('team-seed-47', (SELECT a.id FROM public.alts a WHERE a.username = 'annette_harber2'), false),
    ('team-seed-48', (SELECT a.id FROM public.alts a WHERE a.username = 'charlotteschoen99'), false),
    ('team-seed-49', (SELECT a.id FROM public.alts a WHERE a.username = 'diamond_kunze75'), false),
    ('team-seed-50', (SELECT a.id FROM public.alts a WHERE a.username = 'gummy_pro'), false)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.teams (name, created_by, is_public) VALUES
    ('team-seed-51', (SELECT a.id FROM public.alts a WHERE a.username = 'monica_crist_fahey79'), false),
    ('team-seed-52', (SELECT a.id FROM public.alts a WHERE a.username = 'savanah33'), false),
    ('team-seed-53', (SELECT a.id FROM public.alts a WHERE a.username = 'lonny_bechtelar49'), false),
    ('team-seed-54', (SELECT a.id FROM public.alts a WHERE a.username = 'thrifty_trainer_14'), false),
    ('team-seed-55', (SELECT a.id FROM public.alts a WHERE a.username = 'outstanding_elite'), false),
    ('team-seed-56', (SELECT a.id FROM public.alts a WHERE a.username = 'shad_williamson9'), false),
    ('team-seed-57', (SELECT a.id FROM public.alts a WHERE a.username = 'alyson_stiedemann'), false),
    ('team-seed-58', (SELECT a.id FROM public.alts a WHERE a.username = 'westonwilderman14'), false),
    ('team-seed-59', (SELECT a.id FROM public.alts a WHERE a.username = 'titus_kohler60'), false),
    ('team-seed-60', (SELECT a.id FROM public.alts a WHERE a.username = 'filthy_trainer_361'), false),
    ('team-seed-61', (SELECT a.id FROM public.alts a WHERE a.username = 'tressa72'), false),
    ('team-seed-62', (SELECT a.id FROM public.alts a WHERE a.username = 'dominic_zulauf'), false),
    ('team-seed-63', (SELECT a.id FROM public.alts a WHERE a.username = 'artfritsch16'), false),
    ('team-seed-64', (SELECT a.id FROM public.alts a WHERE a.username = 'irma58'), false),
    ('team-seed-65', (SELECT a.id FROM public.alts a WHERE a.username = 'frivolous_master'), false),
    ('team-seed-66', (SELECT a.id FROM public.alts a WHERE a.username = 'chaz13'), false),
    ('team-seed-67', (SELECT a.id FROM public.alts a WHERE a.username = 'unused_trainer_669'), false),
    ('team-seed-68', (SELECT a.id FROM public.alts a WHERE a.username = 'those_trainer_198'), false),
    ('team-seed-69', (SELECT a.id FROM public.alts a WHERE a.username = 'lorna_effertz'), false),
    ('team-seed-70', (SELECT a.id FROM public.alts a WHERE a.username = 'thoramarvin72'), false),
    ('team-seed-71', (SELECT a.id FROM public.alts a WHERE a.username = 'big_gym'), false),
    ('team-seed-72', (SELECT a.id FROM public.alts a WHERE a.username = 'marquis78'), false),
    ('team-seed-73', (SELECT a.id FROM public.alts a WHERE a.username = 'eminent_ranger'), false),
    ('team-seed-74', (SELECT a.id FROM public.alts a WHERE a.username = 'kamron_kemmer91'), false),
    ('team-seed-75', (SELECT a.id FROM public.alts a WHERE a.username = 'defensive_champion'), false),
    ('team-seed-76', (SELECT a.id FROM public.alts a WHERE a.username = 'oleflatley25'), false),
    ('team-seed-77', (SELECT a.id FROM public.alts a WHERE a.username = 'salty_trainer_403'), false),
    ('team-seed-78', (SELECT a.id FROM public.alts a WHERE a.username = 'well_to_do_trainer_5'), false),
    ('team-seed-79', (SELECT a.id FROM public.alts a WHERE a.username = 'quick_trainer_532'), false),
    ('team-seed-80', (SELECT a.id FROM public.alts a WHERE a.username = 'cristobalupton55'), false),
    ('team-seed-81', (SELECT a.id FROM public.alts a WHERE a.username = 'izabellabeahan79'), false),
    ('team-seed-82', (SELECT a.id FROM public.alts a WHERE a.username = 'jackiebins45'), false),
    ('team-seed-83', (SELECT a.id FROM public.alts a WHERE a.username = 'leta_kunde1'), false),
    ('team-seed-84', (SELECT a.id FROM public.alts a WHERE a.username = 'jeffryyost15'), false),
    ('team-seed-85', (SELECT a.id FROM public.alts a WHERE a.username = 'ellis_paucek'), false),
    ('team-seed-86', (SELECT a.id FROM public.alts a WHERE a.username = 'jeraldferry81'), false),
    ('team-seed-87', (SELECT a.id FROM public.alts a WHERE a.username = 'norene68'), false),
    ('team-seed-88', (SELECT a.id FROM public.alts a WHERE a.username = 'smooth_trainer_36'), false),
    ('team-seed-89', (SELECT a.id FROM public.alts a WHERE a.username = 'quincy_pouros90'), false),
    ('team-seed-90', (SELECT a.id FROM public.alts a WHERE a.username = 'skylar_bednar'), false),
    ('team-seed-91', (SELECT a.id FROM public.alts a WHERE a.username = 'viviane_rempel'), false),
    ('team-seed-92', (SELECT a.id FROM public.alts a WHERE a.username = 'houston_walter'), false),
    ('team-seed-93', (SELECT a.id FROM public.alts a WHERE a.username = 'shad_williamson9'), false),
    ('team-seed-94', (SELECT a.id FROM public.alts a WHERE a.username = 'charlotteschoen99'), false),
    ('team-seed-95', (SELECT a.id FROM public.alts a WHERE a.username = 'amber_reichel25'), false),
    ('team-seed-96', (SELECT a.id FROM public.alts a WHERE a.username = 'fausto_mraz11'), false),
    ('team-seed-97', (SELECT a.id FROM public.alts a WHERE a.username = 'jayson63'), false),
    ('team-seed-98', (SELECT a.id FROM public.alts a WHERE a.username = 'nicola69'), false),
    ('team-seed-99', (SELECT a.id FROM public.alts a WHERE a.username = 'titus_kohler60'), false),
    ('team-seed-100', (SELECT a.id FROM public.alts a WHERE a.username = 'squeaky_trainer_454'), false)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.teams (name, created_by, is_public) VALUES
    ('team-seed-101', (SELECT a.id FROM public.alts a WHERE a.username = 'ronny_koss27'), false),
    ('team-seed-102', (SELECT a.id FROM public.alts a WHERE a.username = 'katrina16'), false),
    ('team-seed-103', (SELECT a.id FROM public.alts a WHERE a.username = 'nervous_trainer'), false),
    ('team-seed-104', (SELECT a.id FROM public.alts a WHERE a.username = 'marilyne_bogan7'), false),
    ('team-seed-105', (SELECT a.id FROM public.alts a WHERE a.username = 'nigeljerde94'), false),
    ('team-seed-106', (SELECT a.id FROM public.alts a WHERE a.username = 'werner_auer80'), false),
    ('team-seed-107', (SELECT a.id FROM public.alts a WHERE a.username = 'hilbert38'), false),
    ('team-seed-108', (SELECT a.id FROM public.alts a WHERE a.username = 'lance'), false),
    ('team-seed-109', (SELECT a.id FROM public.alts a WHERE a.username = 'sniveling_trainer'), false),
    ('team-seed-110', (SELECT a.id FROM public.alts a WHERE a.username = 'distinct_breeder'), false),
    ('team-seed-111', (SELECT a.id FROM public.alts a WHERE a.username = 'vidaboyle57'), false),
    ('team-seed-112', (SELECT a.id FROM public.alts a WHERE a.username = 'claudestreich31'), false),
    ('team-seed-113', (SELECT a.id FROM public.alts a WHERE a.username = 'major_breeder'), false),
    ('team-seed-114', (SELECT a.id FROM public.alts a WHERE a.username = 'rosy_trainer_409'), false),
    ('team-seed-115', (SELECT a.id FROM public.alts a WHERE a.username = 'karen'), false),
    ('team-seed-116', (SELECT a.id FROM public.alts a WHERE a.username = 'emiliebednar53'), false),
    ('team-seed-117', (SELECT a.id FROM public.alts a WHERE a.username = 'winifred46'), false),
    ('team-seed-118', (SELECT a.id FROM public.alts a WHERE a.username = 'submissive_trainer_7'), false),
    ('team-seed-119', (SELECT a.id FROM public.alts a WHERE a.username = 'ash_ketchum'), false),
    ('team-seed-120', (SELECT a.id FROM public.alts a WHERE a.username = 'novakuhic68'), false),
    ('team-seed-121', (SELECT a.id FROM public.alts a WHERE a.username = 'multicolored_champio'), false),
    ('team-seed-122', (SELECT a.id FROM public.alts a WHERE a.username = 'frozen_trainer_101'), false),
    ('team-seed-123', (SELECT a.id FROM public.alts a WHERE a.username = 'treverhartmann73'), false),
    ('team-seed-124', (SELECT a.id FROM public.alts a WHERE a.username = 'valentinaklocko65'), false),
    ('team-seed-125', (SELECT a.id FROM public.alts a WHERE a.username = 'alda_rau2'), false),
    ('team-seed-126', (SELECT a.id FROM public.alts a WHERE a.username = 'shanelfeeney90'), false),
    ('team-seed-127', (SELECT a.id FROM public.alts a WHERE a.username = 'dallas56'), false),
    ('team-seed-128', (SELECT a.id FROM public.alts a WHERE a.username = 'those_trainer_198'), false),
    ('team-seed-129', (SELECT a.id FROM public.alts a WHERE a.username = 'well_to_do_trainer_5'), false),
    ('team-seed-130', (SELECT a.id FROM public.alts a WHERE a.username = 'eminent_ranger'), false),
    ('team-seed-131', (SELECT a.id FROM public.alts a WHERE a.username = 'incomplete_trainer_6'), false),
    ('team-seed-132', (SELECT a.id FROM public.alts a WHERE a.username = 'abelardo_konopelski'), false),
    ('team-seed-133', (SELECT a.id FROM public.alts a WHERE a.username = 'karen'), false),
    ('team-seed-134', (SELECT a.id FROM public.alts a WHERE a.username = 'blanca13'), false),
    ('team-seed-135', (SELECT a.id FROM public.alts a WHERE a.username = 'fausto_mraz11'), false),
    ('team-seed-136', (SELECT a.id FROM public.alts a WHERE a.username = 'jacynthe_klein'), false),
    ('team-seed-137', (SELECT a.id FROM public.alts a WHERE a.username = 'front_trainer_895'), false),
    ('team-seed-138', (SELECT a.id FROM public.alts a WHERE a.username = 'chad_friesen'), false),
    ('team-seed-139', (SELECT a.id FROM public.alts a WHERE a.username = 'norene68'), false),
    ('team-seed-140', (SELECT a.id FROM public.alts a WHERE a.username = 'malvinamitchell24'), false),
    ('team-seed-141', (SELECT a.id FROM public.alts a WHERE a.username = 'dominic_zulauf'), false),
    ('team-seed-142', (SELECT a.id FROM public.alts a WHERE a.username = 'broderick40'), false),
    ('team-seed-143', (SELECT a.id FROM public.alts a WHERE a.username = 'sniveling_trainer'), false),
    ('team-seed-144', (SELECT a.id FROM public.alts a WHERE a.username = 'khalillarson_schuppe'), false),
    ('team-seed-145', (SELECT a.id FROM public.alts a WHERE a.username = 'big_gym'), false),
    ('team-seed-146', (SELECT a.id FROM public.alts a WHERE a.username = 'oswaldo_kling'), false),
    ('team-seed-147', (SELECT a.id FROM public.alts a WHERE a.username = 'qualified_trainer_61'), false),
    ('team-seed-148', (SELECT a.id FROM public.alts a WHERE a.username = 'crooked_gym'), false),
    ('team-seed-149', (SELECT a.id FROM public.alts a WHERE a.username = 'kayden33'), false),
    ('team-seed-150', (SELECT a.id FROM public.alts a WHERE a.username = 'kenna_beahan'), false)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.teams (name, created_by, is_public) VALUES
    ('team-seed-151', (SELECT a.id FROM public.alts a WHERE a.username = 'cristobalupton55'), false),
    ('team-seed-152', (SELECT a.id FROM public.alts a WHERE a.username = 'marilie_medhurst82'), false),
    ('team-seed-153', (SELECT a.id FROM public.alts a WHERE a.username = 'ornery_trainer_904'), false),
    ('team-seed-154', (SELECT a.id FROM public.alts a WHERE a.username = 'delectable_trainer_3'), false),
    ('team-seed-155', (SELECT a.id FROM public.alts a WHERE a.username = 'brilliant_breeder'), false),
    ('team-seed-156', (SELECT a.id FROM public.alts a WHERE a.username = 'fred_pacocha47'), false),
    ('team-seed-157', (SELECT a.id FROM public.alts a WHERE a.username = 'multicolored_champio'), false),
    ('team-seed-158', (SELECT a.id FROM public.alts a WHERE a.username = 'twin_trainer_704'), false),
    ('team-seed-159', (SELECT a.id FROM public.alts a WHERE a.username = 'scornful_trainer_666'), false),
    ('team-seed-160', (SELECT a.id FROM public.alts a WHERE a.username = 'wicked_trainer'), false),
    ('team-seed-161', (SELECT a.id FROM public.alts a WHERE a.username = 'robin_schultz'), false),
    ('team-seed-162', (SELECT a.id FROM public.alts a WHERE a.username = 'shanie_maggio'), false),
    ('team-seed-163', (SELECT a.id FROM public.alts a WHERE a.username = 'kasey_jacobi99'), false),
    ('team-seed-164', (SELECT a.id FROM public.alts a WHERE a.username = 'shy_ace'), false),
    ('team-seed-165', (SELECT a.id FROM public.alts a WHERE a.username = 'shad_williamson9'), false),
    ('team-seed-166', (SELECT a.id FROM public.alts a WHERE a.username = 'squeaky_trainer_454'), false),
    ('team-seed-167', (SELECT a.id FROM public.alts a WHERE a.username = 'trusting_trainer_973'), false),
    ('team-seed-168', (SELECT a.id FROM public.alts a WHERE a.username = 'shaylee16'), false),
    ('team-seed-169', (SELECT a.id FROM public.alts a WHERE a.username = 'red'), false),
    ('team-seed-170', (SELECT a.id FROM public.alts a WHERE a.username = 'sally_block33'), false),
    ('team-seed-171', (SELECT a.id FROM public.alts a WHERE a.username = 'westonwilderman14'), false),
    ('team-seed-172', (SELECT a.id FROM public.alts a WHERE a.username = 'izabellabeahan79'), false),
    ('team-seed-173', (SELECT a.id FROM public.alts a WHERE a.username = 'adela1'), false),
    ('team-seed-174', (SELECT a.id FROM public.alts a WHERE a.username = 'delilaho_hara84'), false),
    ('team-seed-175', (SELECT a.id FROM public.alts a WHERE a.username = 'cathrinemosciski_wun'), false),
    ('team-seed-176', (SELECT a.id FROM public.alts a WHERE a.username = 'treviono_kon17'), false),
    ('team-seed-177', (SELECT a.id FROM public.alts a WHERE a.username = 'valentinaklocko65'), false),
    ('team-seed-178', (SELECT a.id FROM public.alts a WHERE a.username = 'claudestreich31'), false),
    ('team-seed-179', (SELECT a.id FROM public.alts a WHERE a.username = 'noted_gym'), false),
    ('team-seed-180', (SELECT a.id FROM public.alts a WHERE a.username = 'lonny_bechtelar49'), false),
    ('team-seed-181', (SELECT a.id FROM public.alts a WHERE a.username = 'emiliebednar53'), false),
    ('team-seed-182', (SELECT a.id FROM public.alts a WHERE a.username = 'janellebradtke25'), false),
    ('team-seed-183', (SELECT a.id FROM public.alts a WHERE a.username = 'lee51'), false),
    ('team-seed-184', (SELECT a.id FROM public.alts a WHERE a.username = 'admin_trainer'), false),
    ('team-seed-185', (SELECT a.id FROM public.alts a WHERE a.username = 'candid_breeder'), false),
    ('team-seed-186', (SELECT a.id FROM public.alts a WHERE a.username = 'elsie_stroman'), false),
    ('team-seed-187', (SELECT a.id FROM public.alts a WHERE a.username = 'jessicaleannon22'), false),
    ('team-seed-188', (SELECT a.id FROM public.alts a WHERE a.username = 'krystina_beatty85'), false),
    ('team-seed-189', (SELECT a.id FROM public.alts a WHERE a.username = 'mariannamacejkovic76'), false),
    ('team-seed-190', (SELECT a.id FROM public.alts a WHERE a.username = 'domenic_jast43'), false),
    ('team-seed-191', (SELECT a.id FROM public.alts a WHERE a.username = 'blank_trainer_642'), false),
    ('team-seed-192', (SELECT a.id FROM public.alts a WHERE a.username = 'made_up_trainer_12'), false),
    ('team-seed-193', (SELECT a.id FROM public.alts a WHERE a.username = 'lance'), false)
  ON CONFLICT DO NOTHING;

  -- Insert pokemon
  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', true,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, true,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, true,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', true,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, true,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, true,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Focus Sash', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, true,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', true,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', true,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Assault Vest', 'Male', true,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', NULL, 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, true,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, true,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Focus Sash', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', true,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, true,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, true,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', true,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', true,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, true,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, true,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', true,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', true,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', true,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Focus Sash', NULL, true,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, true,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', true,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', true,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Focus Sash', 'Male', true,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Focus Sash', 'Male', true,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, true,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, true,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, true,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', true,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, true,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', true,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, true,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', NULL, 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Choice Specs', NULL, true,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, true,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', true,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Focus Sash', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Focus Sash', 'Male', true,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Booster Energy', NULL, true,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, true,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Life Orb', 'Male', true,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'U-turn', 'Rapid Spin', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Booster Energy', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Focus Sash', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Assault Vest', 'Male', true,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, true,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Drain Punch', 'Wild Charge', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', true,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, true,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Aqua Jet', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', true,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Jolly', 'Unseen Fist', 'Choice Scarf', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Overheat', 'Dark Pulse', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Focus Sash', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Focus Sash', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Mental Herb', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Booster Energy', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, true,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Impish', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, true,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Focus Sash', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Mental Herb', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Modest', 'As One', 'Life Orb', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', true,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Assault Vest', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Fly', 'Swords Dance', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Porygon2', NULL, 50, 'Calm', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', true,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Focus Sash', 'Male', false,
     'Icicle Crash', 'Crunch', 'Sacred Sword', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', true,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Focus Sash', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Clear Amulet', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Jolly', 'Queenly Majesty', 'Wide Lens', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Assault Vest', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Choice Scarf', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Life Orb', NULL, true,
     'Glacial Lance', 'High Horsepower', 'Trick Room', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', true,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Focus Sash', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Adamant', 'As One', 'Life Orb', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Chi-Yu', NULL, 50, 'Modest', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Timid', 'Quark Drive', 'Focus Sash', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Life Orb', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Adamant', 'Intimidate', 'Assault Vest', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Choice Specs', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Assault Vest', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Focus Sash', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', true,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Focus Blast', 'Expanding Force', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Stone Edge', 'Extreme Speed', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Focus Sash', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     252, 0, 4, 0, 0, 252,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Draining Kiss', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Chien-Pao', NULL, 50, 'Jolly', 'Sword of Ruin', 'Life Orb', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Safety Goggles', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Sacred Sword', 'Psycho Cut', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Brave', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Life Orb', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Incineroar', NULL, 50, 'Adamant', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Relaxed', 'Regenerator', 'Rocky Helmet', 'Male', true,
     'Spore', 'Rage Powder', 'Pollen Puff', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Tri Attack', 'Eerie Impulse', 'Recover',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Focus Sash', NULL, true,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Safety Goggles', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Iron Crown', NULL, 50, 'Modest', 'Quark Drive', 'Booster Energy', NULL, false,
     'Tachyon Cutter', 'Calm Mind', 'Psyshock', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Koraidon', NULL, 50, 'Jolly', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Farigiraf', NULL, 50, 'Quiet', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Adamant', 'Supreme Overlord', 'Black Glasses', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Psychic', 'Helping Hand', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Male', true,
     'Tailwind', 'Bleakwind Storm', 'Rain Dance', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Modest', 'Good as Gold', 'Choice Specs', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Leftovers', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Tornadus', NULL, 50, 'Hasty', 'Prankster', 'Covert Cloak', 'Male', false,
     'Tailwind', 'Hurricane', 'Taunt', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Koraidon', NULL, 50, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false,
     'Collision Course', 'Flare Blitz', 'Close Combat', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Urshifu-Rapid-Strike', NULL, 50, 'Adamant', 'Unseen Fist', 'Mystic Water', 'Male', false,
     'Surging Strikes', 'Close Combat', 'Detect', 'U-turn',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Hands', NULL, 50, 'Adamant', 'Quark Drive', 'Booster Energy', NULL, false,
     'Close Combat', 'Thunder Punch', 'Fake Out', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Rillaboom', NULL, 50, 'Adamant', 'Grassy Surge', 'Choice Band', 'Male', false,
     'Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Adamant', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Mental Herb', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Calyrex-Ice', NULL, 50, 'Brave', 'As One', 'Clear Amulet', NULL, false,
     'Glacial Lance', 'Close Combat', 'Swords Dance', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Tsareena', NULL, 50, 'Adamant', 'Queenly Majesty', 'Assault Vest', 'Female', false,
     'Power Whip', 'High Jump Kick', 'Triple Axel', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Moonblast', 'Encore', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Landorus-Therian', NULL, 50, 'Jolly', 'Intimidate', 'Life Orb', 'Male', false,
     'Earthquake', 'Rock Slide', 'U-turn', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Miraidon', NULL, 50, 'Modest', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Wood Hammer', 'Stomping Tantrum', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Calm', 'Drizzle', 'Damp Rock', 'Male', false,
     'Hurricane', 'Weather Ball', 'Tailwind', 'Protect',
     252, 0, 0, 252, 4, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Leftovers', 'Male', false,
     'Body Press', 'Flash Cannon', 'Electro Shot', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Relaxed', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Miraidon', NULL, 50, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false,
     'Electro Drift', 'Draco Meteor', 'Parabolic Charge', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Entei', NULL, 50, 'Adamant', 'Inner Focus', 'Choice Band', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Rillaboom', NULL, 50, 'Jolly', 'Grassy Surge', 'Miracle Seed', 'Male', false,
     'Grassy Glide', 'Knock Off', 'Fake Out', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Ogerpon-Wellspring', NULL, 50, 'Jolly', 'Water Absorb', 'Wellspring Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Air Balloon', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Jolly', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Archaludon', NULL, 50, 'Bold', 'Stamina', 'Power Herb', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Assault Vest', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Farigiraf', NULL, 50, 'Modest', 'Armor Tail', 'Sitrus Berry', 'Female', false,
     'Trick Room', 'Hyper Voice', 'Psychic', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Lum Berry', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Sitrus Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Timid', 'Prankster', 'Focus Sash', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false,
     'Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Timid', 'Protosynthesis', 'Choice Specs', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Kowtow Cleave', 'Protect',
     252, 252, 0, 0, 4, 0,
     NULL),
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', NULL, 'Male', true,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Calyrex-Shadow', NULL, 50, 'Timid', 'As One', 'Choice Specs', NULL, false,
     'Astral Barrage', 'Psyshock', 'Nasty Plot', 'Protect',
     252, 0, 0, 252, 0, 4,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Entei', NULL, 50, 'Jolly', 'Inner Focus', 'Charcoal', NULL, false,
     'Sacred Fire', 'Extreme Speed', 'Stomping Tantrum', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Chi-Yu', NULL, 50, 'Timid', 'Beads of Ruin', 'Safety Goggles', 'Male', false,
     'Heat Wave', 'Dark Pulse', 'Snarl', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Calm', 'Regenerator', 'Coba Berry', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 128, 0, 128, 0,
     NULL),
    ('Gholdengo', NULL, 50, 'Timid', 'Good as Gold', 'Focus Sash', NULL, false,
     'Make It Rain', 'Shadow Ball', 'Trick', 'Protect',
     4, 0, 0, 252, 0, 252,
     NULL),
    ('Chien-Pao', NULL, 50, 'Adamant', 'Sword of Ruin', 'Clear Amulet', 'Male', false,
     'Ice Spinner', 'Sacred Sword', 'Sucker Punch', 'Protect',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Iron Boulder', NULL, 50, 'Jolly', 'Quark Drive', 'Booster Energy', NULL, false,
     'Mighty Cleave', 'Close Combat', 'Zen Headbutt', 'Protect',
     252, 252, 0, 0, 0, 4,
     NULL),
    ('Ogerpon-Hearthflame', NULL, 50, 'Adamant', 'Mold Breaker', 'Hearthflame Mask', 'Female', false,
     'Ivy Cudgel', 'Horn Leech', 'Follow Me', 'Spiky Shield',
     4, 252, 0, 0, 0, 252,
     NULL),
    ('Archaludon', NULL, 50, 'Modest', 'Stamina', 'Assault Vest', 'Male', false,
     'Body Press', 'Flash Cannon', 'Iron Defense', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pokemon (
    species, nickname, level, nature, ability, held_item, gender, is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    tera_type
  ) VALUES
    ('Incineroar', NULL, 50, 'Impish', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Protect',
     252, 0, 4, 0, 252, 0,
     NULL),
    ('Amoonguss', NULL, 50, 'Bold', 'Regenerator', 'Rocky Helmet', 'Male', false,
     'Spore', 'Rage Powder', 'Sludge Bomb', 'Protect',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Flutter Mane', NULL, 50, 'Modest', 'Protosynthesis', 'Booster Energy', NULL, false,
     'Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL),
    ('Arcanine', NULL, 50, 'Careful', 'Intimidate', 'Sitrus Berry', 'Male', false,
     'Flare Blitz', 'Close Combat', 'Snarl', 'Protect',
     252, 4, 0, 0, 252, 0,
     NULL),
    ('Whimsicott', NULL, 50, 'Bold', 'Prankster', 'Covert Cloak', 'Female', false,
     'Tailwind', 'Helping Hand', 'Taunt', 'Moonblast',
     252, 0, 0, 4, 0, 252,
     NULL),
    ('Kingambit', NULL, 50, 'Brave', 'Supreme Overlord', 'Assault Vest', 'Male', false,
     'Sucker Punch', 'Iron Head', 'Swords Dance', 'Protect',
     252, 252, 4, 0, 0, 0,
     NULL),
    ('Porygon2', NULL, 50, 'Sassy', 'Download', 'Eviolite', NULL, false,
     'Trick Room', 'Ice Beam', 'Recover', 'Thunderbolt',
     252, 0, 252, 0, 4, 0,
     NULL),
    ('Pelipper', NULL, 50, 'Modest', 'Drizzle', 'Focus Sash', 'Male', false,
     'Scald', 'Hurricane', 'Tailwind', 'Protect',
     252, 0, 4, 252, 0, 0,
     NULL)
  ON CONFLICT DO NOTHING;

  -- Insert team_pokemon links
  -- Uses subqueries to resolve auto-generated IDs by team name and pokemon attributes
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Drain Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Overheat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Modest'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Calm'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Icicle Crash'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Modest'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Brave'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Iron Crown'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Modest'
      AND p.move1 = 'Tachyon Cutter'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Quiet'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Modest'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Tornadus'
      AND p.ability = 'Prankster'
      AND p.nature = 'Hasty'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Koraidon'
      AND p.ability = 'Orichalcum Pulse'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Collision Course'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Urshifu-Rapid-Strike'
      AND p.ability = 'Unseen Fist'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Surging Strikes'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Iron Hands'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Close Combat'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Ice'
      AND p.ability = 'As One'
      AND p.nature = 'Brave'
      AND p.move1 = 'Glacial Lance'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Tsareena'
      AND p.ability = 'Queenly Majesty'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Power Whip'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Landorus-Therian'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Earthquake'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Modest'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Calm'
      AND p.move1 = 'Hurricane'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Relaxed'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Miraidon'
      AND p.ability = 'Hadron Engine'
      AND p.nature = 'Timid'
      AND p.move1 = 'Electro Drift'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Rillaboom'
      AND p.ability = 'Grassy Surge'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Grassy Glide'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Wellspring'
      AND p.ability = 'Water Absorb'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Bold'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Farigiraf'
      AND p.ability = 'Armor Tail'
      AND p.nature = 'Modest'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Timid'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Timid'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Calyrex-Shadow'
      AND p.ability = 'As One'
      AND p.nature = 'Timid'
      AND p.move1 = 'Astral Barrage'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Entei'
      AND p.ability = 'Inner Focus'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Sacred Fire'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Chi-Yu'
      AND p.ability = 'Beads of Ruin'
      AND p.nature = 'Timid'
      AND p.move1 = 'Heat Wave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Calm'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Gholdengo'
      AND p.ability = 'Good as Gold'
      AND p.nature = 'Timid'
      AND p.move1 = 'Make It Rain'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Chien-Pao'
      AND p.ability = 'Sword of Ruin'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ice Spinner'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Iron Boulder'
      AND p.ability = 'Quark Drive'
      AND p.nature = 'Jolly'
      AND p.move1 = 'Mighty Cleave'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Ogerpon-Hearthflame'
      AND p.ability = 'Mold Breaker'
      AND p.nature = 'Adamant'
      AND p.move1 = 'Ivy Cudgel'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Archaludon'
      AND p.ability = 'Stamina'
      AND p.nature = 'Modest'
      AND p.move1 = 'Body Press'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Incineroar'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Impish'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Amoonguss'
      AND p.ability = 'Regenerator'
      AND p.nature = 'Bold'
      AND p.move1 = 'Spore'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      1
    FROM public.pokemon p
    WHERE p.species = 'Flutter Mane'
      AND p.ability = 'Protosynthesis'
      AND p.nature = 'Modest'
      AND p.move1 = 'Moonblast'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      2
    FROM public.pokemon p
    WHERE p.species = 'Arcanine'
      AND p.ability = 'Intimidate'
      AND p.nature = 'Careful'
      AND p.move1 = 'Flare Blitz'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      3
    FROM public.pokemon p
    WHERE p.species = 'Whimsicott'
      AND p.ability = 'Prankster'
      AND p.nature = 'Bold'
      AND p.move1 = 'Tailwind'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      4
    FROM public.pokemon p
    WHERE p.species = 'Kingambit'
      AND p.ability = 'Supreme Overlord'
      AND p.nature = 'Brave'
      AND p.move1 = 'Sucker Punch'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      5
    FROM public.pokemon p
    WHERE p.species = 'Porygon2'
      AND p.ability = 'Download'
      AND p.nature = 'Sassy'
      AND p.move1 = 'Trick Room'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  INSERT INTO public.team_pokemon (team_id, pokemon_id, team_position)
    SELECT
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      p.id,
      6
    FROM public.pokemon p
    WHERE p.species = 'Pelipper'
      AND p.ability = 'Drizzle'
      AND p.nature = 'Modest'
      AND p.move1 = 'Scald'
    LIMIT 1
    ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 193 teams, 1158 pokemon, 1158 team_pokemon links';
END $$;
