-- =============================================================================
-- Users and Profiles Tables (IDEMPOTENT)
-- =============================================================================
-- Core user identity tables. Users are linked to auth.users, profiles represent
-- player identities that can participate in tournaments.
-- Uses CREATE TABLE IF NOT EXISTS and DO blocks for constraints.

-- Users table (matches auth.users.id)
-- Note: PRIMARY KEY must be defined inline for FK references to work in same transaction
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL PRIMARY KEY,
    "email" "text",
    "name" "text",
    "image" "text",
    "username" "text",
    "phone_number" "text",
    "main_profile_id" bigint,
    "is_locked" boolean DEFAULT false,
    "external_accounts" "jsonb" DEFAULT '[]'::"jsonb",
    "public_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_sign_in_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    "first_name" "text",
    "last_name" "text",
    "birth_date" "date",
    "country" "text"
);
ALTER TABLE "public"."users" OWNER TO "postgres";

-- Profiles table (player identities)
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "username" "text" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "battle_tag" "text",
    "tier" "public"."user_tier" DEFAULT 'free'::"public"."user_tier",
    "tier_expires_at" timestamp with time zone,
    "tier_started_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";

-- Rate limits (for API throttling)
CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "identifier" "text" NOT NULL,
    "request_timestamps" timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[],
    "window_start" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."rate_limits" OWNER TO "postgres";

-- Unique constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_limits_identifier_key') THEN
        ALTER TABLE ONLY "public"."rate_limits" ADD CONSTRAINT "rate_limits_identifier_key" UNIQUE ("identifier");
    END IF;
END $$;

-- Foreign keys (profiles -> users)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."profiles"
            ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================================================
-- Now that profiles table exists, create the profile-dependent functions
-- =============================================================================

-- Get the current authenticated user's profile ID
CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
$$;
ALTER FUNCTION "public"."get_current_profile_id"() OWNER TO "postgres";

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

-- Note: users.main_profile_id FK is added after organizations table exists
