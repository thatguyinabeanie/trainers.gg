


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."billing_interval" AS ENUM (
    'monthly',
    'annual'
);


ALTER TYPE "public"."billing_interval" OWNER TO "postgres";


CREATE TYPE "public"."entity_type" AS ENUM (
    'profile',
    'organization'
);


ALTER TYPE "public"."entity_type" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."org_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."org_request_status" OWNER TO "postgres";


CREATE TYPE "public"."organization_status" AS ENUM (
    'pending',
    'active',
    'rejected'
);


ALTER TYPE "public"."organization_status" OWNER TO "postgres";


CREATE TYPE "public"."organization_subscription_tier" AS ENUM (
    'free',
    'organization_plus',
    'enterprise'
);


ALTER TYPE "public"."organization_subscription_tier" OWNER TO "postgres";


CREATE TYPE "public"."organization_tier" AS ENUM (
    'regular',
    'verified',
    'partner'
);


ALTER TYPE "public"."organization_tier" OWNER TO "postgres";


CREATE TYPE "public"."phase_status" AS ENUM (
    'pending',
    'active',
    'completed'
);


ALTER TYPE "public"."phase_status" OWNER TO "postgres";


CREATE TYPE "public"."pokemon_gender" AS ENUM (
    'Male',
    'Female'
);


ALTER TYPE "public"."pokemon_gender" OWNER TO "postgres";


CREATE TYPE "public"."registration_status" AS ENUM (
    'pending',
    'registered',
    'confirmed',
    'waitlist',
    'checked_in',
    'dropped',
    'withdrawn'
);


ALTER TYPE "public"."registration_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'cancelled',
    'expired',
    'past_due'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."tournament_format" AS ENUM (
    'swiss_only',
    'swiss_with_cut',
    'single_elimination',
    'double_elimination'
);


ALTER TYPE "public"."tournament_format" OWNER TO "postgres";


CREATE TYPE "public"."tournament_status" AS ENUM (
    'draft',
    'upcoming',
    'active',
    'paused',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."tournament_status" OWNER TO "postgres";


CREATE TYPE "public"."user_tier" AS ENUM (
    'free',
    'player_pro',
    'coach_premium'
);


ALTER TYPE "public"."user_tier" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


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
  new_profile_id uuid;
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
    id,
    user_id,
    username,
    display_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
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


CREATE TABLE IF NOT EXISTS "public"."feature_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "feature_key" "text" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "usage" integer DEFAULT 0,
    "usage_limit" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invited_profile_id" "uuid" NOT NULL,
    "invited_by_profile_id" "uuid" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "requested_by_profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "status" "public"."org_request_status" DEFAULT 'pending'::"public"."org_request_status",
    "reviewed_by_profile_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "logo_url" "text",
    "status" "public"."organization_status" DEFAULT 'pending'::"public"."organization_status",
    "owner_profile_id" "uuid" NOT NULL,
    "discord_url" "text",
    "twitter_url" "text",
    "website_url" "text",
    "tier" "public"."organization_tier" DEFAULT 'regular'::"public"."organization_tier",
    "subscription_tier" "public"."organization_subscription_tier" DEFAULT 'free'::"public"."organization_subscription_tier",
    "subscription_expires_at" timestamp with time zone,
    "subscription_started_at" timestamp with time zone,
    "platform_fee_percentage" numeric(5,4) DEFAULT 0.05,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "species" "text" NOT NULL,
    "nickname" "text",
    "level" integer DEFAULT 50,
    "nature" "text" NOT NULL,
    "ability" "text" NOT NULL,
    "held_item" "text",
    "gender" "public"."pokemon_gender",
    "is_shiny" boolean DEFAULT false,
    "move1" "text" NOT NULL,
    "move2" "text",
    "move3" "text",
    "move4" "text",
    "ev_hp" integer DEFAULT 0,
    "ev_attack" integer DEFAULT 0,
    "ev_defense" integer DEFAULT 0,
    "ev_special_attack" integer DEFAULT 0,
    "ev_special_defense" integer DEFAULT 0,
    "ev_speed" integer DEFAULT 0,
    "iv_hp" integer DEFAULT 31,
    "iv_attack" integer DEFAULT 31,
    "iv_defense" integer DEFAULT 31,
    "iv_special_attack" integer DEFAULT 31,
    "iv_special_defense" integer DEFAULT 31,
    "iv_speed" integer DEFAULT 31,
    "tera_type" "text",
    "format_legal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ev_total_check" CHECK ((((((("ev_hp" + "ev_attack") + "ev_defense") + "ev_special_attack") + "ev_special_defense") + "ev_speed") <= 510)),
    CONSTRAINT "pokemon_ev_attack_check" CHECK ((("ev_attack" >= 0) AND ("ev_attack" <= 252))),
    CONSTRAINT "pokemon_ev_defense_check" CHECK ((("ev_defense" >= 0) AND ("ev_defense" <= 252))),
    CONSTRAINT "pokemon_ev_hp_check" CHECK ((("ev_hp" >= 0) AND ("ev_hp" <= 252))),
    CONSTRAINT "pokemon_ev_special_attack_check" CHECK ((("ev_special_attack" >= 0) AND ("ev_special_attack" <= 252))),
    CONSTRAINT "pokemon_ev_special_defense_check" CHECK ((("ev_special_defense" >= 0) AND ("ev_special_defense" <= 252))),
    CONSTRAINT "pokemon_ev_speed_check" CHECK ((("ev_speed" >= 0) AND ("ev_speed" <= 252))),
    CONSTRAINT "pokemon_iv_attack_check" CHECK ((("iv_attack" >= 0) AND ("iv_attack" <= 31))),
    CONSTRAINT "pokemon_iv_defense_check" CHECK ((("iv_defense" >= 0) AND ("iv_defense" <= 31))),
    CONSTRAINT "pokemon_iv_hp_check" CHECK ((("iv_hp" >= 0) AND ("iv_hp" <= 31))),
    CONSTRAINT "pokemon_iv_special_attack_check" CHECK ((("iv_special_attack" >= 0) AND ("iv_special_attack" <= 31))),
    CONSTRAINT "pokemon_iv_special_defense_check" CHECK ((("iv_special_defense" >= 0) AND ("iv_special_defense" <= 31))),
    CONSTRAINT "pokemon_iv_speed_check" CHECK ((("iv_speed" >= 0) AND ("iv_speed" <= 31)))
);


ALTER TABLE "public"."pokemon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_group_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profile_group_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "identifier" "text" NOT NULL,
    "request_timestamps" timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[],
    "window_start" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "tier" "text" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "stripe_subscription_id" "text",
    "billing_interval" "public"."billing_interval" DEFAULT 'monthly'::"public"."billing_interval",
    "amount" integer,
    "currency" "text" DEFAULT 'usd'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_pokemon" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "pokemon_id" "uuid" NOT NULL,
    "team_position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_pokemon_team_position_check" CHECK ((("team_position" >= 1) AND ("team_position" <= 6)))
);


ALTER TABLE "public"."team_pokemon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "is_public" boolean DEFAULT false,
    "format_legal" boolean DEFAULT true,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "invited_profile_id" "uuid" NOT NULL,
    "invited_by_profile_id" "uuid" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status",
    "message" "text",
    "expires_at" timestamp with time zone,
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    "registration_id" "uuid"
);


ALTER TABLE "public"."tournament_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_matches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "profile1_id" "uuid",
    "profile2_id" "uuid",
    "winner_profile_id" "uuid",
    "match_points1" integer DEFAULT 0,
    "match_points2" integer DEFAULT 0,
    "game_wins1" integer DEFAULT 0,
    "game_wins2" integer DEFAULT 0,
    "is_bye" boolean DEFAULT false,
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "table_number" integer,
    "player1_match_confirmed" boolean DEFAULT false,
    "player2_match_confirmed" boolean DEFAULT false,
    "match_confirmed_at" timestamp with time zone,
    "staff_requested" boolean DEFAULT false,
    "staff_requested_at" timestamp with time zone,
    "staff_resolved_by" "uuid",
    "staff_notes" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_opponent_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "opponent_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_opponent_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_pairings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "profile1_id" "uuid",
    "profile2_id" "uuid",
    "pairing_type" "text" NOT NULL,
    "is_bye" boolean DEFAULT false,
    "table_number" integer,
    "profile1_seed" integer,
    "profile2_seed" integer,
    "pairing_reason" "text",
    "algorithm_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_pairings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_phases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "phase_type" "text" NOT NULL,
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "match_format" "text" NOT NULL,
    "round_time_minutes" integer,
    "planned_rounds" integer,
    "current_round" integer DEFAULT 0,
    "advancement_type" "text",
    "advancement_count" integer,
    "bracket_size" integer,
    "total_rounds" integer,
    "bracket_format" "text",
    "seeding_method" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_player_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "match_points" integer DEFAULT 0,
    "matches_played" integer DEFAULT 0,
    "match_wins" integer DEFAULT 0,
    "match_losses" integer DEFAULT 0,
    "match_win_percentage" numeric(5,4) DEFAULT 0,
    "game_wins" integer DEFAULT 0,
    "game_losses" integer DEFAULT 0,
    "game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "strength_of_schedule" numeric(10,6) DEFAULT 0,
    "buchholz_score" numeric(10,6) DEFAULT 0,
    "modified_buchholz_score" numeric(10,6) DEFAULT 0,
    "last_tiebreaker_update" timestamp with time zone,
    "current_standing" integer,
    "standings_need_recalc" boolean DEFAULT true,
    "has_received_bye" boolean DEFAULT false,
    "is_dropped" boolean DEFAULT false,
    "current_seed" integer,
    "final_ranking" integer,
    "opponent_history" "uuid"[] DEFAULT '{}'::"uuid"[],
    "rounds_played" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_registration_pokemon" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_registration_id" "uuid" NOT NULL,
    "pokemon_id" "uuid" NOT NULL,
    "team_position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tournament_registration_pokemon_team_position_check" CHECK ((("team_position" >= 1) AND ("team_position" <= 6)))
);


ALTER TABLE "public"."tournament_registration_pokemon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_registrations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "status" "public"."registration_status" DEFAULT 'pending'::"public"."registration_status",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "checked_in_at" timestamp with time zone,
    "team_name" "text",
    "notes" "text",
    "team_id" "uuid",
    "rental_team_photo_url" "text",
    "rental_team_photo_key" "text",
    "rental_team_photo_uploaded_at" timestamp with time zone,
    "rental_team_photo_verified" boolean DEFAULT false,
    "rental_team_photo_verified_by" "uuid",
    "rental_team_photo_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_rounds" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "phase_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "name" "text",
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "time_extension_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_standings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "match_points" integer DEFAULT 0,
    "game_wins" integer DEFAULT 0,
    "game_losses" integer DEFAULT 0,
    "match_win_percentage" numeric(5,4) DEFAULT 0,
    "game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_game_win_percentage" numeric(5,4) DEFAULT 0,
    "rank" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_template_phases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "phase_type" "text" NOT NULL,
    "phase_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_template_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "organization_id" "uuid",
    "is_public" boolean DEFAULT false,
    "template_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "use_count" integer DEFAULT 0,
    "is_official" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "format" "text",
    "status" "public"."tournament_status" DEFAULT 'draft'::"public"."tournament_status",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "registration_deadline" timestamp with time zone,
    "max_participants" integer,
    "top_cut_size" integer,
    "swiss_rounds" integer,
    "tournament_format" "public"."tournament_format",
    "round_time_minutes" integer DEFAULT 50,
    "check_in_window_minutes" integer DEFAULT 60,
    "featured" boolean DEFAULT false,
    "prize_pool" "text",
    "rental_team_photos_enabled" boolean DEFAULT false,
    "rental_team_photos_required" boolean DEFAULT false,
    "template_id" "uuid",
    "current_phase_id" "uuid",
    "current_round" integer DEFAULT 0,
    "participants" "uuid"[] DEFAULT '{}'::"uuid"[],
    "tournament_state" "jsonb" DEFAULT '{}'::"jsonb",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "image" "text",
    "username" "text",
    "phone_number" "text",
    "main_profile_id" "uuid",
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


ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_entity_id_entity_type_feature_key_period_star_key" UNIQUE ("entity_id", "entity_type", "feature_key", "period_start");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_role_id_key" UNIQUE ("group_id", "role_id");



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_profile_id_key" UNIQUE ("organization_id", "profile_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon"
    ADD CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_profile_id_group_role_id_key" UNIQUE ("profile_id", "group_role_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_pokemon_id_key" UNIQUE ("team_id", "pokemon_id");



ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_team_position_key" UNIQUE ("team_id", "team_position");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_events"
    ADD CONSTRAINT "tournament_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_tournament_id_invited_profile_id_key" UNIQUE ("tournament_id", "invited_profile_id");



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_tournament_id_profile_id_oppone_key" UNIQUE ("tournament_id", "profile_id", "opponent_id", "round_number");



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_phases"
    ADD CONSTRAINT "tournament_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_player_stats"
    ADD CONSTRAINT "tournament_player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_player_stats"
    ADD CONSTRAINT "tournament_player_stats_tournament_id_profile_id_key" UNIQUE ("tournament_id", "profile_id");



ALTER TABLE ONLY "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokem_tournament_registration_id_po_key" UNIQUE ("tournament_registration_id", "pokemon_id");



ALTER TABLE ONLY "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokem_tournament_registration_id_te_key" UNIQUE ("tournament_registration_id", "team_position");



ALTER TABLE ONLY "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_profile_id_key" UNIQUE ("tournament_id", "profile_id");



ALTER TABLE ONLY "public"."tournament_rounds"
    ADD CONSTRAINT "tournament_rounds_phase_id_round_number_key" UNIQUE ("phase_id", "round_number");



ALTER TABLE ONLY "public"."tournament_rounds"
    ADD CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_standings"
    ADD CONSTRAINT "tournament_standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_standings"
    ADD CONSTRAINT "tournament_standings_tournament_id_profile_id_round_number_key" UNIQUE ("tournament_id", "profile_id", "round_number");



ALTER TABLE ONLY "public"."tournament_template_phases"
    ADD CONSTRAINT "tournament_template_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_templates"
    ADD CONSTRAINT "tournament_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_organization_id_slug_key" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_events_tournament" ON "public"."tournament_events" USING "btree" ("tournament_id");



CREATE INDEX "idx_events_tournament_type" ON "public"."tournament_events" USING "btree" ("tournament_id", "event_type");



CREATE INDEX "idx_events_type" ON "public"."tournament_events" USING "btree" ("event_type");



CREATE INDEX "idx_feature_usage_entity" ON "public"."feature_usage" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_feature_usage_feature" ON "public"."feature_usage" USING "btree" ("entity_id", "entity_type", "feature_key");



CREATE INDEX "idx_feature_usage_period" ON "public"."feature_usage" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_group_roles_group" ON "public"."group_roles" USING "btree" ("group_id");



CREATE INDEX "idx_group_roles_role" ON "public"."group_roles" USING "btree" ("role_id");



CREATE INDEX "idx_groups_org" ON "public"."groups" USING "btree" ("organization_id");



CREATE INDEX "idx_matches_profile1" ON "public"."tournament_matches" USING "btree" ("profile1_id");



CREATE INDEX "idx_matches_profile2" ON "public"."tournament_matches" USING "btree" ("profile2_id");



CREATE INDEX "idx_matches_round" ON "public"."tournament_matches" USING "btree" ("round_id");



CREATE INDEX "idx_matches_round_status" ON "public"."tournament_matches" USING "btree" ("round_id", "status");



CREATE INDEX "idx_opponent_history_tournament" ON "public"."tournament_opponent_history" USING "btree" ("tournament_id");



CREATE INDEX "idx_opponent_history_tournament_profile" ON "public"."tournament_opponent_history" USING "btree" ("tournament_id", "profile_id");



CREATE INDEX "idx_org_invitations_invited" ON "public"."organization_invitations" USING "btree" ("invited_profile_id");



CREATE INDEX "idx_org_invitations_org" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_org_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_profile" ON "public"."organization_members" USING "btree" ("profile_id");



CREATE INDEX "idx_organizations_owner" ON "public"."organizations" USING "btree" ("owner_profile_id");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_organizations_subscription_tier" ON "public"."organizations" USING "btree" ("subscription_tier");



CREATE INDEX "idx_organizations_tier" ON "public"."organizations" USING "btree" ("tier");



CREATE INDEX "idx_pairings_round" ON "public"."tournament_pairings" USING "btree" ("round_id");



CREATE INDEX "idx_pairings_tournament" ON "public"."tournament_pairings" USING "btree" ("tournament_id");



CREATE INDEX "idx_phases_tournament" ON "public"."tournament_phases" USING "btree" ("tournament_id");



CREATE INDEX "idx_phases_tournament_order" ON "public"."tournament_phases" USING "btree" ("tournament_id", "phase_order");



CREATE INDEX "idx_player_stats_profile" ON "public"."tournament_player_stats" USING "btree" ("profile_id");



CREATE INDEX "idx_player_stats_tournament" ON "public"."tournament_player_stats" USING "btree" ("tournament_id");



CREATE INDEX "idx_pokemon_species" ON "public"."pokemon" USING "btree" ("species");



CREATE INDEX "idx_profile_group_roles_profile" ON "public"."profile_group_roles" USING "btree" ("profile_id");



CREATE INDEX "idx_profiles_tier" ON "public"."profiles" USING "btree" ("tier");



CREATE INDEX "idx_profiles_tier_expiry" ON "public"."profiles" USING "btree" ("tier_expires_at");



CREATE INDEX "idx_profiles_user" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_rate_limits_expires" ON "public"."rate_limits" USING "btree" ("expires_at");



CREATE INDEX "idx_rate_limits_identifier" ON "public"."rate_limits" USING "btree" ("identifier");



CREATE INDEX "idx_reg_pokemon_registration" ON "public"."tournament_registration_pokemon" USING "btree" ("tournament_registration_id");



CREATE INDEX "idx_registrations_profile" ON "public"."tournament_registrations" USING "btree" ("profile_id");



CREATE INDEX "idx_registrations_tournament" ON "public"."tournament_registrations" USING "btree" ("tournament_id");



CREATE INDEX "idx_registrations_tournament_status" ON "public"."tournament_registrations" USING "btree" ("tournament_id", "status");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_rounds_phase" ON "public"."tournament_rounds" USING "btree" ("phase_id");



CREATE INDEX "idx_standings_tournament_round" ON "public"."tournament_standings" USING "btree" ("tournament_id", "round_number");



CREATE INDEX "idx_subscriptions_entity" ON "public"."subscriptions" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_subscriptions_expires" ON "public"."subscriptions" USING "btree" ("expires_at");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_team_pokemon_pokemon" ON "public"."team_pokemon" USING "btree" ("pokemon_id");



CREATE INDEX "idx_team_pokemon_team" ON "public"."team_pokemon" USING "btree" ("team_id");



CREATE INDEX "idx_teams_creator" ON "public"."teams" USING "btree" ("created_by");



CREATE INDEX "idx_teams_public" ON "public"."teams" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_template_phases_template" ON "public"."tournament_template_phases" USING "btree" ("template_id");



CREATE INDEX "idx_templates_creator" ON "public"."tournament_templates" USING "btree" ("created_by");



CREATE INDEX "idx_templates_official" ON "public"."tournament_templates" USING "btree" ("is_official");



CREATE INDEX "idx_templates_org" ON "public"."tournament_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_templates_public" ON "public"."tournament_templates" USING "btree" ("is_public");



CREATE INDEX "idx_tournament_invitations_invited" ON "public"."tournament_invitations" USING "btree" ("invited_profile_id");



CREATE INDEX "idx_tournament_invitations_status" ON "public"."tournament_invitations" USING "btree" ("status");



CREATE INDEX "idx_tournament_invitations_tournament" ON "public"."tournament_invitations" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournaments_archived" ON "public"."tournaments" USING "btree" ("archived_at");



CREATE INDEX "idx_tournaments_featured" ON "public"."tournaments" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_tournaments_org" ON "public"."tournaments" USING "btree" ("organization_id");



CREATE INDEX "idx_tournaments_org_archived" ON "public"."tournaments" USING "btree" ("organization_id", "archived_at");



CREATE INDEX "idx_tournaments_slug" ON "public"."tournaments" USING "btree" ("slug");



CREATE INDEX "idx_tournaments_status" ON "public"."tournaments" USING "btree" ("status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_active" ON "public"."users" USING "btree" ("last_active_at");



CREATE INDEX "idx_users_main_profile" ON "public"."users" USING "btree" ("main_profile_id");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE INDEX "users_birth_date_idx" ON "public"."users" USING "btree" ("birth_date");



CREATE INDEX "users_country_idx" ON "public"."users" USING "btree" ("country");



CREATE INDEX "users_first_name_idx" ON "public"."users" USING "btree" ("first_name");



CREATE INDEX "users_last_name_idx" ON "public"."users" USING "btree" ("last_name");



CREATE OR REPLACE TRIGGER "update_feature_usage_updated_at" BEFORE UPDATE ON "public"."feature_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_player_stats_updated_at" BEFORE UPDATE ON "public"."tournament_player_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_templates_updated_at" BEFORE UPDATE ON "public"."tournament_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournaments_updated_at" BEFORE UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_created_organization_id_fkey" FOREIGN KEY ("created_organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_requested_by_profile_id_fkey" FOREIGN KEY ("requested_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_events"
    ADD CONSTRAINT "tournament_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournament_events"
    ADD CONSTRAINT "tournament_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_staff_resolved_by_fkey" FOREIGN KEY ("staff_resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_winner_profile_id_fkey" FOREIGN KEY ("winner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_phases"
    ADD CONSTRAINT "tournament_phases_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_player_stats"
    ADD CONSTRAINT "tournament_player_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_player_stats"
    ADD CONSTRAINT "tournament_player_stats_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokemon_tournament_registration_id_fkey" FOREIGN KEY ("tournament_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_rental_team_photo_verified_by_fkey" FOREIGN KEY ("rental_team_photo_verified_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_rounds"
    ADD CONSTRAINT "tournament_rounds_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_standings"
    ADD CONSTRAINT "tournament_standings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_standings"
    ADD CONSTRAINT "tournament_standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_template_phases"
    ADD CONSTRAINT "tournament_template_phases_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_templates"
    ADD CONSTRAINT "tournament_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_templates"
    ADD CONSTRAINT "tournament_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_current_phase_fk" FOREIGN KEY ("current_phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_main_profile_fk" FOREIGN KEY ("main_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Allow user creation" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" FOR INSERT WITH CHECK (("owner_profile_id" = "public"."get_current_profile_id"()));



CREATE POLICY "Group roles are viewable by everyone" ON "public"."group_roles" FOR SELECT USING (true);



CREATE POLICY "Groups are viewable by everyone" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Org invitations viewable by involved parties" ON "public"."organization_invitations" FOR SELECT USING ((("invited_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("invited_by_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members are viewable by everyone" ON "public"."organization_members" FOR SELECT USING (true);



CREATE POLICY "Org members can create tournaments" ON "public"."tournaments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "tournaments"."organization_id") AND (("o"."owner_profile_id" = "public"."get_current_profile_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."organization_members" "om"
          WHERE (("om"."organization_id" = "o"."id") AND ("om"."profile_id" = "public"."get_current_profile_id"())))))))));



CREATE POLICY "Org members can update tournaments" ON "public"."tournaments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "tournaments"."organization_id") AND (("o"."owner_profile_id" = "public"."get_current_profile_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."organization_members" "om"
          WHERE (("om"."organization_id" = "o"."id") AND ("om"."profile_id" = "public"."get_current_profile_id"())))))))));



CREATE POLICY "Org owners can add members" ON "public"."organization_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "organization_members"."organization_id") AND ("o"."owner_profile_id" = "public"."get_current_profile_id"())))));



CREATE POLICY "Org owners can remove members" ON "public"."organization_members" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "organization_members"."organization_id") AND ("o"."owner_profile_id" = "public"."get_current_profile_id"())))) OR ("profile_id" = "public"."get_current_profile_id"())));



CREATE POLICY "Org owners can update" ON "public"."organizations" FOR UPDATE USING (("owner_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org requests viewable by requester" ON "public"."organization_requests" FOR SELECT USING (("requested_by_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organizations are viewable by everyone" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "Permissions are viewable by everyone" ON "public"."permissions" FOR SELECT USING (true);



CREATE POLICY "Pokemon viewable via teams" ON "public"."pokemon" FOR SELECT USING (true);



CREATE POLICY "Profile group roles are viewable by everyone" ON "public"."profile_group_roles" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public teams are viewable" ON "public"."teams" FOR SELECT USING ((("is_public" = true) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public templates are viewable" ON "public"."tournament_templates" FOR SELECT USING ((("is_public" = true) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Rate limits service only" ON "public"."rate_limits" USING (false);



CREATE POLICY "Role permissions are viewable by everyone" ON "public"."role_permissions" FOR SELECT USING (true);



CREATE POLICY "Roles are viewable by everyone" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Team owners can delete team pokemon" ON "public"."team_pokemon" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_pokemon"."team_id") AND ("t"."created_by" = "public"."get_current_profile_id"())))));



CREATE POLICY "Team owners can manage team pokemon" ON "public"."team_pokemon" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_pokemon"."team_id") AND ("t"."created_by" = "public"."get_current_profile_id"())))));



CREATE POLICY "Team pokemon viewable" ON "public"."team_pokemon" FOR SELECT USING (true);



CREATE POLICY "Template phases are viewable" ON "public"."tournament_template_phases" FOR SELECT USING (true);



CREATE POLICY "Tournament events are viewable" ON "public"."tournament_events" FOR SELECT USING (true);



CREATE POLICY "Tournament invitations viewable by involved" ON "public"."tournament_invitations" FOR SELECT USING ((("invited_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("invited_by_profile_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tournament matches are viewable" ON "public"."tournament_matches" FOR SELECT USING (true);



CREATE POLICY "Tournament opponent history is viewable" ON "public"."tournament_opponent_history" FOR SELECT USING (true);



CREATE POLICY "Tournament pairings are viewable" ON "public"."tournament_pairings" FOR SELECT USING (true);



CREATE POLICY "Tournament phases are viewable" ON "public"."tournament_phases" FOR SELECT USING (true);



CREATE POLICY "Tournament player stats are viewable" ON "public"."tournament_player_stats" FOR SELECT USING (true);



CREATE POLICY "Tournament registration pokemon viewable" ON "public"."tournament_registration_pokemon" FOR SELECT USING (true);



CREATE POLICY "Tournament registrations are viewable" ON "public"."tournament_registrations" FOR SELECT USING (true);



CREATE POLICY "Tournament rounds are viewable" ON "public"."tournament_rounds" FOR SELECT USING (true);



CREATE POLICY "Tournament standings are viewable" ON "public"."tournament_standings" FOR SELECT USING (true);



CREATE POLICY "Tournaments are viewable by everyone" ON "public"."tournaments" FOR SELECT USING (true);



CREATE POLICY "Users are viewable by everyone" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can cancel own registration" ON "public"."tournament_registrations" FOR DELETE USING (("profile_id" = "public"."get_current_profile_id"()));



CREATE POLICY "Users can create org requests" ON "public"."organization_requests" FOR INSERT WITH CHECK (("requested_by_profile_id" = "public"."get_current_profile_id"()));



CREATE POLICY "Users can create pokemon" ON "public"."pokemon" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can delete own teams" ON "public"."teams" FOR DELETE USING (("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own teams" ON "public"."teams" FOR INSERT WITH CHECK (("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can register for tournaments" ON "public"."tournament_registrations" FOR INSERT WITH CHECK (("profile_id" = "public"."get_current_profile_id"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own record" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own registration" ON "public"."tournament_registrations" FOR UPDATE USING (("profile_id" = "public"."get_current_profile_id"()));



CREATE POLICY "Users can update own teams" ON "public"."teams" FOR UPDATE USING (("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own feature usage" ON "public"."feature_usage" FOR SELECT USING (((("entity_type" = 'profile'::"public"."entity_type") AND ("entity_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))) OR (("entity_type" = 'organization'::"public"."entity_type") AND ("entity_id" IN ( SELECT "o"."id"
   FROM ("public"."organizations" "o"
     JOIN "public"."profiles" "p" ON (("o"."owner_profile_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING (((("entity_type" = 'profile'::"public"."entity_type") AND ("entity_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))) OR (("entity_type" = 'organization'::"public"."entity_type") AND ("entity_id" IN ( SELECT "o"."id"
   FROM ("public"."organizations" "o"
     JOIN "public"."profiles" "p" ON (("o"."owner_profile_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."feature_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_group_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_pokemon" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_opponent_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_pairings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_phases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_player_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_registration_pokemon" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_standings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_template_phases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

























































































































































GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."feature_usage" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage" TO "service_role";



GRANT ALL ON TABLE "public"."group_roles" TO "anon";
GRANT ALL ON TABLE "public"."group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."group_roles" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organization_requests" TO "anon";
GRANT ALL ON TABLE "public"."organization_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_requests" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon" TO "anon";
GRANT ALL ON TABLE "public"."pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon" TO "service_role";



GRANT ALL ON TABLE "public"."profile_group_roles" TO "anon";
GRANT ALL ON TABLE "public"."profile_group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_group_roles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."team_pokemon" TO "anon";
GRANT ALL ON TABLE "public"."team_pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."team_pokemon" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_events" TO "anon";
GRANT ALL ON TABLE "public"."tournament_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_events" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_invitations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_matches" TO "anon";
GRANT ALL ON TABLE "public"."tournament_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_matches" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "anon";
GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_pairings" TO "anon";
GRANT ALL ON TABLE "public"."tournament_pairings" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_pairings" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_phases" TO "anon";
GRANT ALL ON TABLE "public"."tournament_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_phases" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_player_stats" TO "anon";
GRANT ALL ON TABLE "public"."tournament_player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_player_stats" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_registrations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_rounds" TO "anon";
GRANT ALL ON TABLE "public"."tournament_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_rounds" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_standings" TO "anon";
GRANT ALL ON TABLE "public"."tournament_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_standings" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_template_phases" TO "anon";
GRANT ALL ON TABLE "public"."tournament_template_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_template_phases" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_templates" TO "anon";
GRANT ALL ON TABLE "public"."tournament_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































