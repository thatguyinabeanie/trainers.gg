-- =============================================================================
-- 06_pokemon.sql - Create Pokemon Data
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT on species+nickname combo (via DO block)
-- Creates sample Pokemon for team building
-- =============================================================================

-- Create Pokemon with idempotency check
-- We store IDs in a temporary table for use in team linking
DO $$
DECLARE
  -- Check if data already exists
  pokemon_exists boolean;
BEGIN
  -- Check if seed Pokemon already exist (using a known species+nickname combo)
  SELECT EXISTS(
    SELECT 1 FROM public.pokemon WHERE species = 'Pikachu' AND nickname = 'Pika'
  ) INTO pokemon_exists;
  
  IF pokemon_exists THEN
    RAISE NOTICE 'Pokemon data already exists, skipping';
    RETURN;
  END IF;

  -- Ash's Team
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Pikachu', 'Pika', 'Timid', 'Static', 'Light Ball', 'Male', false, 'Thunderbolt', 'Volt Tackle', 'Iron Tail', 'Quick Attack', 0, 0, 0, 252, 4, 252, 'Electric');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Charizard', NULL, 'Timid', 'Solar Power', 'Choice Specs', 'Male', false, 'Heat Wave', 'Air Slash', 'Dragon Pulse', 'Protect', 0, 0, 0, 252, 4, 252, 'Fire');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Greninja', NULL, 'Timid', 'Protean', 'Focus Sash', 'Male', false, 'Hydro Pump', 'Ice Beam', 'Dark Pulse', 'Protect', 0, 0, 0, 252, 4, 252, 'Water');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Lucario', 'Ash-Lucario', 'Jolly', 'Inner Focus', 'Life Orb', 'Male', false, 'Close Combat', 'Extreme Speed', 'Bullet Punch', 'Swords Dance', 0, 252, 0, 0, 4, 252, 'Fighting');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Dragonite', NULL, 'Adamant', 'Multiscale', 'Leftovers', 'Male', false, 'Dragon Dance', 'Outrage', 'Extreme Speed', 'Earthquake', 252, 252, 0, 0, 4, 0, 'Normal');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Snorlax', NULL, 'Careful', 'Thick Fat', 'Leftovers', 'Male', false, 'Body Slam', 'Crunch', 'Curse', 'Rest', 252, 0, 0, 0, 252, 4, 'Normal');

  -- Cynthia's Team
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Garchomp', NULL, 'Jolly', 'Rough Skin', 'Rocky Helmet', 'Female', false, 'Earthquake', 'Dragon Claw', 'Swords Dance', 'Protect', 0, 252, 0, 0, 4, 252, 'Ground');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Spiritomb', NULL, 'Bold', 'Pressure', 'Sitrus Berry', 'Female', false, 'Shadow Ball', 'Dark Pulse', 'Will-O-Wisp', 'Pain Split', 252, 0, 252, 0, 4, 0, 'Ghost');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Lucario', 'Cynthia-Lucario', 'Modest', 'Steadfast', 'Choice Specs', 'Male', false, 'Aura Sphere', 'Flash Cannon', 'Vacuum Wave', 'Dragon Pulse', 0, 0, 0, 252, 4, 252, 'Steel');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Togekiss', NULL, 'Timid', 'Serene Grace', 'Scope Lens', 'Female', false, 'Air Slash', 'Dazzling Gleam', 'Follow Me', 'Protect', 252, 0, 0, 252, 4, 0, 'Fairy');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Milotic', NULL, 'Bold', 'Marvel Scale', 'Flame Orb', 'Female', false, 'Scald', 'Ice Beam', 'Recover', 'Protect', 252, 0, 252, 0, 4, 0, 'Water');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Roserade', NULL, 'Timid', 'Natural Cure', 'Focus Sash', 'Female', false, 'Leaf Storm', 'Sludge Bomb', 'Sleep Powder', 'Protect', 0, 0, 0, 252, 4, 252, 'Grass');

  -- Meta Pokemon (Reg G)
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Flutter Mane', NULL, 'Timid', 'Protosynthesis', 'Booster Energy', NULL, false, 'Shadow Ball', 'Moonblast', 'Dazzling Gleam', 'Protect', 0, 0, 0, 252, 4, 252, 'Fairy');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Koraidon', NULL, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet', NULL, false, 'Collision Course', 'Flare Blitz', 'Dragon Claw', 'Protect', 0, 252, 0, 0, 4, 252, 'Fighting');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Miraidon', NULL, 'Timid', 'Hadron Engine', 'Choice Specs', NULL, false, 'Electro Drift', 'Draco Meteor', 'Volt Switch', 'Thunder', 0, 0, 0, 252, 4, 252, 'Electric');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Rillaboom', NULL, 'Adamant', 'Grassy Surge', 'Miracle Seed', 'Male', false, 'Grassy Glide', 'Wood Hammer', 'U-turn', 'Fake Out', 252, 252, 0, 0, 4, 0, 'Grass');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Incineroar', NULL, 'Careful', 'Intimidate', 'Safety Goggles', 'Male', false, 'Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot', 252, 0, 0, 0, 252, 4, 'Dark');
  
  INSERT INTO public.pokemon (species, nickname, nature, ability, held_item, gender, is_shiny, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES ('Amoonguss', NULL, 'Relaxed', 'Regenerator', 'Rocky Helmet', NULL, false, 'Spore', 'Pollen Puff', 'Rage Powder', 'Protect', 252, 0, 252, 0, 4, 0, 'Grass');

  RAISE NOTICE 'Pokemon data created successfully';
END $$;
