-- =============================================================================
-- 09_social.sql - Create Social Data (Follows)
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT
-- Depends on: 03_users.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Follows (social graph)
-- -----------------------------------------------------------------------------

INSERT INTO public.follows (follower_user_id, following_user_id) VALUES
  -- Ash (b2c3...) follows everyone
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Ash → Cynthia
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'), -- Ash → Brock
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'), -- Ash → Karen
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c'), -- Ash → Red
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'), -- Ash → Admin
  -- Cynthia (c3d4...) follows select people
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'), -- Cynthia → Ash
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'), -- Cynthia → Karen
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'), -- Cynthia → Admin
  -- Brock (d4e5...) follows
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'), -- Brock → Ash
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Brock → Cynthia
  -- Karen (e5f6...) follows
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Karen → Cynthia
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c'), -- Karen → Red
  -- Red (f6a7...) follows minimal people (staying in character)
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Red → Cynthia
  -- Admin (a1b2...) follows everyone
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'), -- Admin → Ash
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Admin → Cynthia
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'), -- Admin → Brock
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'), -- Admin → Karen
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c')  -- Admin → Red
ON CONFLICT DO NOTHING;
