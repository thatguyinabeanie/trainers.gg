-- =============================================================================
-- 14_coaching.sql - Coach seed data for local development
-- =============================================================================
-- Marks 4 named users as coaches, sets their main alt, and creates coach
-- profiles so the /coaching directory has something to display.
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING / DO UPDATE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mark users as coaches + set main_alt_id
-- -----------------------------------------------------------------------------

UPDATE public.users SET
  is_coach = true,
  main_alt_id = (SELECT id FROM public.alts WHERE username = 'cynthia' LIMIT 1)
WHERE id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'; -- cynthia

UPDATE public.users SET
  is_coach = true,
  main_alt_id = (SELECT id FROM public.alts WHERE username = 'karen' LIMIT 1)
WHERE id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'; -- karen

UPDATE public.users SET
  is_coach = true,
  main_alt_id = (SELECT id FROM public.alts WHERE username = 'lance' LIMIT 1)
WHERE id = 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d'; -- lance

UPDATE public.users SET
  is_coach = true,
  main_alt_id = (SELECT id FROM public.alts WHERE username = 'red' LIMIT 1)
WHERE id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c'; -- red

-- -----------------------------------------------------------------------------
-- Coach profiles
-- -----------------------------------------------------------------------------

INSERT INTO public.coach_profiles (user_id, headline, bio, formats, links, service_types)
VALUES
  (
    'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', -- cynthia
    'Sinnoh Champion & VGC Veteran — 10+ years of competitive experience',
    'Former Sinnoh Champion turned full-time VGC coach. I specialize in helping players develop strong team-building fundamentals and in-game decision-making. Whether you''re new to competitive play or prepping for a Regional, I can help you get to the next level.',
    ARRAY['vgc2025regh', 'vgc2025regi'],
    '[{"label":"YouTube","url":"https://youtube.com"},{"label":"Liquipedia","url":"https://liquipedia.net"}]'::jsonb,
    ARRAY['live', 'replay_review', 'team_review', 'mentorship']
  ),
  (
    'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', -- karen
    'Elite Four Dark-type specialist — replay review & teambuilding',
    'I believe a truly skilled trainer must use all kinds of Pokemon. My coaching focuses on unconventional team archetypes, speed control, and reading your opponent''s tendencies. Specializing in replay review and team critique.',
    ARRAY['vgc2025regh'],
    '[{"label":"Twitter / X","url":"https://x.com"}]'::jsonb,
    ARRAY['replay_review', 'team_review']
  ),
  (
    'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', -- lance
    'Dragon master coaching players to Regional & International success',
    'Dragon-type specialist and former Indigo Champion. I coach players who want to master high-pressure match situations and clutch decision-making. Available for live sessions and full tournament prep packages.',
    ARRAY['vgc2025regh', 'vgc2025regi', 'vgc2025regj'],
    '[]'::jsonb,
    ARRAY['live', 'mentorship']
  ),
  (
    'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', -- red
    'Silent but deadly — precision teambuilding from the Pokémon Master',
    '...',
    ARRAY['vgc2025regh'],
    '[]'::jsonb,
    ARRAY['team_review']
  )
ON CONFLICT (user_id) DO UPDATE SET
  headline     = EXCLUDED.headline,
  bio          = EXCLUDED.bio,
  formats      = EXCLUDED.formats,
  links        = EXCLUDED.links,
  service_types = EXCLUDED.service_types;
