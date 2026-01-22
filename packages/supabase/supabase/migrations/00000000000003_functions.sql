-- =============================================================================
-- Helper Functions
-- =============================================================================
-- Utility functions used throughout the application for auth, triggers, etc.

-- Get the current authenticated user's profile ID
CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
$$;
ALTER FUNCTION "public"."get_current_profile_id"() OWNER TO "postgres";

-- Get the current authenticated user's ID (auth.uid wrapper)
CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT auth.uid();
$$;
ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";

-- Trigger function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  raw_meta jsonb;
  user_username text;
  user_email text;
  user_name text;
  user_avatar text;
  new_user_id uuid;
  new_profile_id bigint;
  final_username text;
  username_suffix text;
  attempt_count int := 0;
BEGIN
  -- Extract metadata
  raw_meta := NEW.raw_user_meta_data;
  user_email := NEW.email;
  
  -- Get username from metadata (set during signup) or generate from email
  user_username := COALESCE(
    raw_meta->>'username',
    raw_meta->>'preferred_username',
    split_part(user_email, '@', 1)
  );
  
  -- Clean username: lowercase, replace invalid chars
  user_username := lower(regexp_replace(user_username, '[^a-z0-9_-]', '_', 'g'));
  
  -- Ensure minimum length
  IF length(user_username) < 3 THEN
    user_username := user_username || '_user';
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
    SELECT 1 FROM public.profiles WHERE username = final_username
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
  
  -- Create profile record
  INSERT INTO public.profiles (
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
  RETURNING id INTO new_profile_id;
  
  -- Update user with main_profile_id
  UPDATE public.users
  SET main_profile_id = new_profile_id
  WHERE id = new_user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Duplicate key violation in handle_new_user for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';
SET default_table_access_method = "heap";
