-- =============================================================================
-- Users and Profiles Tables
-- =============================================================================
-- Core user identity tables. Users are linked to auth.users, profiles represent
-- player identities that can participate in tournaments.

-- Users table (matches auth.users.id)
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
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
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
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
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "identifier" "text" NOT NULL,
    "request_timestamps" timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[],
    "window_start" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."rate_limits" OWNER TO "postgres";

-- Primary keys
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_identifier_key" UNIQUE ("identifier");

-- Foreign keys (profiles -> users)
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Note: users.main_profile_id FK is added after profiles exists (see organizations migration)
