-- Migration: Remove legacy name column from users table
-- Display name is now computed from first_name + last_name or stored in profiles.display_name

-- Drop the name column
ALTER TABLE public.users DROP COLUMN IF EXISTS name;

-- Recreate the trigger function without the name column reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id uuid;
  new_profile_id uuid;
  user_username text;
  user_first_name text;
  user_last_name text;
  user_display_name text;
  user_birth_date date;
  user_country text;
BEGIN
  -- Extract metadata from the new auth user
  user_username := LOWER(COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'preferred_username',
    NEW.raw_user_meta_data ->> 'user_name',
    SPLIT_PART(NEW.email, '@', 1)
  ));
  
  user_first_name := COALESCE(
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'given_name',
    ''
  );
  
  user_last_name := COALESCE(
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'family_name',
    ''
  );
  
  -- Build display name from first + last, or use full_name from OAuth
  user_display_name := COALESCE(
    NULLIF(TRIM(user_first_name || ' ' || user_last_name), ''),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    user_username
  );
  
  -- Extract birth_date (expects ISO 8601 format: YYYY-MM-DD)
  BEGIN
    user_birth_date := (NEW.raw_user_meta_data ->> 'birth_date')::date;
  EXCEPTION WHEN OTHERS THEN
    user_birth_date := NULL;
  END;
  
  -- Extract country code
  user_country := UPPER(NEW.raw_user_meta_data ->> 'country');
  
  -- Ensure username is unique by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = user_username) LOOP
    user_username := user_username || '_' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4);
  END LOOP;
  
  -- Create the user record (id matches auth.users.id)
  INSERT INTO public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    image,
    birth_date,
    country,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_username,
    NULLIF(user_first_name, ''),
    NULLIF(user_last_name, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
    user_birth_date,
    user_country,
    NOW()
  )
  RETURNING id INTO new_user_id;
  
  -- Create a profile for the user
  INSERT INTO public.profiles (
    user_id,
    username,
    display_name,
    avatar_url,
    created_at
  ) VALUES (
    new_user_id,
    user_username,
    user_display_name,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
    NOW()
  )
  RETURNING id INTO new_profile_id;
  
  -- Set the main_profile_id on the user
  UPDATE public.users 
  SET main_profile_id = new_profile_id 
  WHERE id = new_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
