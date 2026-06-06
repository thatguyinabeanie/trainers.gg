-- =============================================================================
-- 16_usage_rk9.sql - RK9 Champions VGC Format Usage Data (Local Dev Only)
-- =============================================================================
-- Seeds format_meta_stats + pokemon_usage_stats + pokemon_detail_stats for
-- source='rk9' so the Meta Explorer Sankey shows all 4 columns
-- (Species → Ability → Nature → Move) in local development.
--
-- Limitless events don't carry stat_alignment (natures), so this data is
-- rk9-only. The Sankey falls back to 3 columns for non-Champions or
-- Limitless-only views per the field availability rule.
-- =============================================================================

DO $$
DECLARE
  meta_id bigint;
BEGIN

  -- ---------------------------------------------------------------------------
  -- 1. format_meta_stats
  -- ---------------------------------------------------------------------------
  INSERT INTO public.format_meta_stats (
    format,
    source,
    period_type,
    period_start,
    period_end,
    total_teams,
    total_tournaments
  )
  VALUES (
    'gen9championsvgc2026regma',
    'rk9',
    'day',
    '2026-06-06',
    '2026-06-06',
    150,
    3
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO meta_id;

  -- If the row already existed (ON CONFLICT), look up its id.
  IF meta_id IS NULL THEN
    SELECT id INTO meta_id
    FROM public.format_meta_stats
    WHERE format      = 'gen9championsvgc2026regma'
      AND source      = 'rk9'
      AND period_type = 'day'
      AND period_start = '2026-06-06';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. pokemon_usage_stats
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pokemon_usage_stats
    (meta_id, rank, species, usage_pct, sample_size)
  VALUES
    (meta_id,  1, 'garchomp',      68.0, 150),
    (meta_id,  2, 'incineroar',    63.5, 150),
    (meta_id,  3, 'rillaboom',     58.0, 150),
    (meta_id,  4, 'urshifu',       52.5, 150),
    (meta_id,  5, 'flutter-mane',  48.0, 150),
    (meta_id,  6, 'charizard',     44.5, 150),
    (meta_id,  7, 'miraidon',      40.0, 150),
    (meta_id,  8, 'koraidon',      37.5, 150),
    (meta_id,  9, 'calyrex-shadow',33.0, 150),
    (meta_id, 10, 'volcarona',     28.5, 150)
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 3. pokemon_detail_stats
  -- ---------------------------------------------------------------------------

  -- garchomp
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'garchomp',
    '[{"value":"Rough Skin","count":147,"pct":98.0},{"value":"Sand Veil","count":3,"pct":2.0}]',
    '[{"value":"Jolly","count":114,"pct":76.0},{"value":"Adamant","count":27,"pct":18.0},{"value":"Naive","count":9,"pct":6.0}]',
    '[{"value":"Earthquake","count":148,"pct":98.7},{"value":"Dragon Claw","count":121,"pct":80.7},{"value":"Protect","count":118,"pct":78.7},{"value":"Scale Shot","count":94,"pct":62.7}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- incineroar
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'incineroar',
    '[{"value":"Intimidate","count":95,"pct":100.0}]',
    '[{"value":"Careful","count":61,"pct":64.2},{"value":"Impish","count":21,"pct":22.1},{"value":"Brave","count":13,"pct":13.7}]',
    '[{"value":"Fake Out","count":95,"pct":100.0},{"value":"Knock Off","count":91,"pct":95.8},{"value":"Flare Blitz","count":87,"pct":91.6},{"value":"U-turn","count":62,"pct":65.3}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- rillaboom
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'rillaboom',
    '[{"value":"Grassy Surge","count":87,"pct":100.0}]',
    '[{"value":"Adamant","count":70,"pct":80.5},{"value":"Jolly","count":13,"pct":14.9},{"value":"Brave","count":4,"pct":4.6}]',
    '[{"value":"Grassy Glide","count":87,"pct":100.0},{"value":"Wood Hammer","count":72,"pct":82.8},{"value":"Fake Out","count":68,"pct":78.2},{"value":"Protect","count":85,"pct":97.7}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- urshifu
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'urshifu',
    '[{"value":"Unseen Fist","count":79,"pct":100.0}]',
    '[{"value":"Adamant","count":51,"pct":64.6},{"value":"Jolly","count":22,"pct":27.8},{"value":"Naive","count":6,"pct":7.6}]',
    '[{"value":"Wicked Blow","count":79,"pct":100.0},{"value":"Sucker Punch","count":74,"pct":93.7},{"value":"Close Combat","count":61,"pct":77.2},{"value":"Protect","count":77,"pct":97.5}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- flutter-mane
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'flutter-mane',
    '[{"value":"Protosynthesis","count":72,"pct":100.0}]',
    '[{"value":"Timid","count":52,"pct":72.2},{"value":"Modest","count":14,"pct":19.4},{"value":"Hasty","count":6,"pct":8.3}]',
    '[{"value":"Moonblast","count":72,"pct":100.0},{"value":"Shadow Ball","count":68,"pct":94.4},{"value":"Protect","count":69,"pct":95.8},{"value":"Icy Wind","count":55,"pct":76.4}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- charizard
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'charizard',
    '[{"value":"Solar Power","count":52,"pct":77.6},{"value":"Blaze","count":15,"pct":22.4}]',
    '[{"value":"Timid","count":52,"pct":77.6},{"value":"Modest","count":10,"pct":14.9},{"value":"Hasty","count":5,"pct":7.5}]',
    '[{"value":"Heat Wave","count":67,"pct":100.0},{"value":"Dragon Pulse","count":58,"pct":86.6},{"value":"Air Slash","count":48,"pct":71.6},{"value":"Protect","count":65,"pct":97.0}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- miraidon
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'miraidon',
    '[{"value":"Hadron Engine","count":60,"pct":100.0}]',
    '[{"value":"Timid","count":44,"pct":73.3},{"value":"Modest","count":12,"pct":20.0},{"value":"Hasty","count":4,"pct":6.7}]',
    '[{"value":"Electro Drift","count":60,"pct":100.0},{"value":"Draco Meteor","count":55,"pct":91.7},{"value":"Volt Switch","count":48,"pct":80.0},{"value":"Protect","count":58,"pct":96.7}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- koraidon
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'koraidon',
    '[{"value":"Orichalcum Pulse","count":56,"pct":100.0}]',
    '[{"value":"Jolly","count":39,"pct":69.6},{"value":"Adamant","count":13,"pct":23.2},{"value":"Naive","count":4,"pct":7.1}]',
    '[{"value":"Collision Course","count":56,"pct":100.0},{"value":"Flare Blitz","count":51,"pct":91.1},{"value":"Dragon Claw","count":44,"pct":78.6},{"value":"Protect","count":55,"pct":98.2}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- calyrex-shadow
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'calyrex-shadow',
    '[{"value":"As One","count":50,"pct":100.0}]',
    '[{"value":"Timid","count":29,"pct":58.0},{"value":"Modest","count":12,"pct":24.0},{"value":"Hasty","count":7,"pct":14.0},{"value":"Bold","count":2,"pct":4.0}]',
    '[{"value":"Astral Barrage","count":50,"pct":100.0},{"value":"Nasty Plot","count":45,"pct":90.0},{"value":"Protect","count":48,"pct":96.0},{"value":"Icy Wind","count":38,"pct":76.0}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- volcarona
  INSERT INTO public.pokemon_detail_stats
    (meta_id, species, abilities, natures, moves, items, spreads, tera_types, ability_items, teammates)
  VALUES (
    meta_id,
    'volcarona',
    '[{"value":"Flame Body","count":43,"pct":100.0}]',
    '[{"value":"Modest","count":31,"pct":72.1},{"value":"Timid","count":9,"pct":20.9},{"value":"Bold","count":3,"pct":7.0}]',
    '[{"value":"Heat Wave","count":43,"pct":100.0},{"value":"Bug Buzz","count":40,"pct":93.0},{"value":"Quiver Dance","count":35,"pct":81.4},{"value":"Protect","count":41,"pct":95.3}]',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

END $$;
