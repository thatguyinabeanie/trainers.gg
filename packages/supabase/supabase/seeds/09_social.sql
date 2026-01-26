-- =============================================================================
-- 09_social.sql - Create Social Data (Follows, Posts, Likes)
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- Depends on: 03_users.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Follows (social graph)
-- -----------------------------------------------------------------------------
-- Follows use user_id (not alt_id) as follows are user-level

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

-- -----------------------------------------------------------------------------
-- Posts (social feed content)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  posts_exist boolean;
  post_cynthia_1 bigint;
  post_cynthia_2 bigint;
  post_cynthia_3 bigint;
  post_ash_1 bigint;
  post_ash_2 bigint;
  post_ash_3 bigint;
  post_ash_4 bigint;
  post_karen_1 bigint;
  post_karen_2 bigint;
  post_brock_1 bigint;
  post_brock_2 bigint;
  post_red_1 bigint;
  post_admin_1 bigint;
  post_admin_2 bigint;
  post_admin_3 bigint;
  post_reply_1 bigint;
  post_reply_2 bigint;
BEGIN
  -- Check if posts already exist
  SELECT EXISTS(
    SELECT 1 FROM public.posts WHERE content LIKE '%Flutter Mane usage is at 47%'
  ) INTO posts_exist;
  
  IF posts_exist THEN
    RAISE NOTICE 'Posts already exist, skipping';
    RETURN;
  END IF;

  -- Cynthia's posts (champion-level insights)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Just finished analyzing the Regulation G metagame. Flutter Mane usage is at 47% - we need to adapt our teambuilding. My Garchomp set has been putting in work against it.', NOW() - INTERVAL '2 hours')
  RETURNING id INTO post_cynthia_1;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'The bond between trainer and Pokemon determines the outcome of every battle. Technical skill is important, but trust is everything.', NOW() - INTERVAL '1 day')
  RETURNING id INTO post_cynthia_2;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Sinnoh Regional Qualifier was incredible! 128 players and the level of competition keeps rising. Proud of everyone who participated.', NOW() - INTERVAL '7 days')
  RETURNING id INTO post_cynthia_3;

  -- Ash's posts (enthusiastic, learning-focused)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Just hit Master Ball tier! Pikachu''s Light Ball set is still viable, you just gotta believe in your Pokemon!', NOW() - INTERVAL '30 minutes')
  RETURNING id INTO post_ash_1;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'VGC Weekly #41 was tough but we learned a lot. Koraidon matchup is still tricky - anyone have tips for the Charizard lead?', NOW() - INTERVAL '5 hours')
  RETURNING id INTO post_ash_2;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'New team idea: What if we ran Dragonite with Thunder Wave support instead of Dragon Dance? Slower setup but more consistent?', NOW() - INTERVAL '12 hours')
  RETURNING id INTO post_ash_3;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Shoutout to the Pallet Town Trainers community for the practice matches today. This is why I love this game!', NOW() - INTERVAL '2 days')
  RETURNING id INTO post_ash_4;

  -- Karen's posts (philosophical, elite four vibes)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Strong Pokemon. Weak Pokemon. That is only the selfish perception of people. Truly skilled trainers should try to win with their favorites.', NOW() - INTERVAL '3 hours')
  RETURNING id INTO post_karen_1;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Unpopular opinion: The "anti-meta" approach is often just as predictable as the meta itself. True innovation requires deeper understanding.', NOW() - INTERVAL '18 hours')
  RETURNING id INTO post_karen_2;

  -- Brock's posts (breeding/training focused)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Finally bred a perfect 6IV Geodude! Rock-types don''t get enough love in VGC but I''m determined to make them work.', NOW() - INTERVAL '4 hours')
  RETURNING id INTO post_brock_1;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Pro tip: When breeding for competitive, always keep track of your egg groups. Makes building a diverse breeding pool much easier.', NOW() - INTERVAL '1 day' - INTERVAL '6 hours')
  RETURNING id INTO post_brock_2;

  -- Red's post (minimal, legendary status)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', '...', NOW() - INTERVAL '3 days')
  RETURNING id INTO post_red_1;

  -- Admin posts (platform/tournament focused)
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'VGC Monthly Championship is LIVE! Check in now if you''re registered. Stream starting in 30 minutes.', NOW() - INTERVAL '2 hours' - INTERVAL '30 minutes')
  RETURNING id INTO post_admin_1;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'VGC Weekly #42 registration is now open! 32 player cap, Bo3 Swiss into Top 8. Sign up on trainers.gg before spots fill up!', NOW() - INTERVAL '1 day')
  RETURNING id INTO post_admin_2;
  
  INSERT INTO public.posts (user_id, content, created_at)
  VALUES ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Welcome to trainers.gg! We''re building the best platform for competitive Pokemon players. Let us know what features you want to see!', NOW() - INTERVAL '5 days')
  RETURNING id INTO post_admin_3;

  -- Reply posts (threading examples)
  INSERT INTO public.posts (user_id, content, reply_to_id, created_at)
  VALUES ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Congrats Ash! Light Ball Pikachu is underrated. The Fake Out + Volt Tackle pressure is real.', post_ash_1, NOW() - INTERVAL '25 minutes')
  RETURNING id INTO post_reply_1;
  
  INSERT INTO public.posts (user_id, content, reply_to_id, created_at)
  VALUES ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Well played! Consider running Follow Me support - it helps Pikachu set up safely.', post_ash_1, NOW() - INTERVAL '20 minutes')
  RETURNING id INTO post_reply_2;

  -- ==========================================================================
  -- Post Likes
  -- ==========================================================================
  
  -- Cynthia's first post gets lots of likes (meta analysis)
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_cynthia_1, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_cynthia_1, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'),
    (post_cynthia_1, 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'),
    (post_cynthia_1, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  
  -- Cynthia's bond post
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_cynthia_2, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_cynthia_2, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'),
    (post_cynthia_2, 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c');
  
  -- Ash's master ball post
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_ash_1, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'),
    (post_ash_1, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'),
    (post_ash_1, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  
  -- Ash's team idea post
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_ash_3, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'),
    (post_ash_3, 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b');
  
  -- Karen's philosophy post (controversial = engagement)
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_karen_1, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'),
    (post_karen_1, 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c'),
    (post_karen_1, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  
  -- Brock's breeding post
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_brock_1, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e');
  
  -- Red's mysterious post (everyone likes it)
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_red_1, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_red_1, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'),
    (post_red_1, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a'),
    (post_red_1, 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b'),
    (post_red_1, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  
  -- Admin's welcome post
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_admin_3, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_admin_3, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'),
    (post_admin_3, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a');
  
  -- Reply likes
  INSERT INTO public.post_likes (post_id, user_id) VALUES
    (post_reply_1, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_reply_2, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'),
    (post_reply_2, 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a');

  RAISE NOTICE 'Social data (posts, likes) created successfully';
END $$;
