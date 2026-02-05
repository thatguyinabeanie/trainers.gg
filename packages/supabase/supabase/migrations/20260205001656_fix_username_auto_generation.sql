-- Fix username auto-generation to stop extracting from email
-- BEA-217: Stop auto-generating username from email during signup
--
-- This migration updates the handle_new_user() trigger function to:
-- 1. Remove email prefix extraction fallback (privacy issue)
-- 2. Generate temporary placeholder usernames (temp_<uuid>) when no OAuth metadata available
-- 3. Preserve OAuth metadata extraction (preferred_username, username)
--
-- Users with placeholder usernames will be required to choose a custom username during onboarding.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  raw_meta jsonb;
  user_username text;
  user_email text;
  user_name text;
  user_avatar text;
  new_user_id uuid;
  new_alt_id bigint;
  final_username text;
  username_suffix text;
  attempt_count int := 0;
BEGIN
  -- Extract metadata
  raw_meta := NEW.raw_user_meta_data;
  user_email := NEW.email;

  -- Get username from OAuth metadata only (NO email fallback)
  user_username := COALESCE(
    raw_meta->>'username',
    raw_meta->>'preferred_username'
  );

  -- If no username from OAuth, create temporary placeholder
  IF user_username IS NULL OR user_username = '' THEN
    user_username := 'temp_' || substr(gen_random_uuid()::text, 1, 12);
  ELSE
    -- Clean username: lowercase, replace invalid chars
    user_username := lower(regexp_replace(user_username, '[^a-z0-9_-]', '_', 'g'));

    -- Ensure minimum length
    IF length(user_username) < 3 THEN
      user_username := user_username || '_user';
    END IF;
  END IF;

  -- Get name from metadata or use username
  user_name := COALESCE(
    raw_meta->>'name',
    raw_meta->>'full_name',
    user_username
  );

  -- Get avatar from metadata
  user_avatar := COALESCE(
    raw_meta->>'avatar_url',
    raw_meta->>'picture'
  );

  -- Ensure username uniqueness by appending random suffix if needed
  final_username := user_username;
  WHILE EXISTS (
    SELECT 1 FROM public.alts WHERE username = final_username
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE username = final_username
  ) LOOP
    attempt_count := attempt_count + 1;
    IF attempt_count > 10 THEN
      -- Fallback to UUID-based username
      final_username := 'user_' || substr(gen_random_uuid()::text, 1, 8);
      EXIT;
    END IF;
    username_suffix := substr(md5(random()::text), 1, 4);
    final_username := user_username || '_' || username_suffix;
  END LOOP;

  -- Create user record
  INSERT INTO public.users (
    id,
    email,
    username,
    name,
    image,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    final_username,
    user_name,
    user_avatar,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Create alt record (main alt for the user)
  INSERT INTO public.alts (
    user_id,
    username,
    display_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    final_username,
    user_name,
    user_avatar,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_alt_id;

  -- Link main alt to user
  UPDATE public.users
  SET main_alt_id = new_alt_id
  WHERE id = new_user_id;

  RETURN NEW;
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function for new user signup. Creates user and alt records. Extracts username from OAuth metadata (username, preferred_username). Generates temp_<uuid> placeholder if no OAuth username available. Placeholder usernames must be replaced during onboarding.';
