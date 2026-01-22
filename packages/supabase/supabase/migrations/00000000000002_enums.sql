-- =============================================================================
-- Enum Types (IDEMPOTENT)
-- =============================================================================
-- All custom enum types used throughout the application.
-- Uses DO blocks to check for existence before creating.

-- Helper function to create enum if not exists
DO $$
BEGIN
    -- Billing interval
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_interval') THEN
        CREATE TYPE "public"."billing_interval" AS ENUM ('monthly', 'annual');
    END IF;

    -- Entity types for polymorphic relationships
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
        CREATE TYPE "public"."entity_type" AS ENUM ('profile', 'organization');
    END IF;

    -- Invitation status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE "public"."invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'expired');
    END IF;

    -- Organization request status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_request_status') THEN
        CREATE TYPE "public"."org_request_status" AS ENUM ('pending', 'approved', 'rejected');
    END IF;

    -- Organization status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status') THEN
        CREATE TYPE "public"."organization_status" AS ENUM ('pending', 'active', 'rejected');
    END IF;

    -- Organization subscription tier
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_subscription_tier') THEN
        CREATE TYPE "public"."organization_subscription_tier" AS ENUM ('free', 'organization_plus', 'enterprise');
    END IF;

    -- Organization tier (verification level)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_tier') THEN
        CREATE TYPE "public"."organization_tier" AS ENUM ('regular', 'verified', 'partner');
    END IF;

    -- Phase status (tournaments, rounds)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phase_status') THEN
        CREATE TYPE "public"."phase_status" AS ENUM ('pending', 'active', 'completed');
    END IF;

    -- Pokemon gender
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pokemon_gender') THEN
        CREATE TYPE "public"."pokemon_gender" AS ENUM ('Male', 'Female');
    END IF;

    -- Tournament registration status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
        CREATE TYPE "public"."registration_status" AS ENUM ('pending', 'registered', 'confirmed', 'waitlist', 'checked_in', 'dropped', 'withdrawn');
    END IF;

    -- Subscription status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE "public"."subscription_status" AS ENUM ('active', 'cancelled', 'expired', 'past_due');
    END IF;

    -- Tournament format
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_format') THEN
        CREATE TYPE "public"."tournament_format" AS ENUM ('swiss_only', 'swiss_with_cut', 'single_elimination', 'double_elimination');
    END IF;

    -- Tournament status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
        CREATE TYPE "public"."tournament_status" AS ENUM ('draft', 'upcoming', 'active', 'paused', 'completed', 'cancelled');
    END IF;

    -- User subscription tier
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier') THEN
        CREATE TYPE "public"."user_tier" AS ENUM ('free', 'player_pro', 'coach_premium');
    END IF;
END $$;

-- Set ownership (idempotent - will succeed even if already set)
ALTER TYPE "public"."billing_interval" OWNER TO "postgres";
ALTER TYPE "public"."entity_type" OWNER TO "postgres";
ALTER TYPE "public"."invitation_status" OWNER TO "postgres";
ALTER TYPE "public"."org_request_status" OWNER TO "postgres";
ALTER TYPE "public"."organization_status" OWNER TO "postgres";
ALTER TYPE "public"."organization_subscription_tier" OWNER TO "postgres";
ALTER TYPE "public"."organization_tier" OWNER TO "postgres";
ALTER TYPE "public"."phase_status" OWNER TO "postgres";
ALTER TYPE "public"."pokemon_gender" OWNER TO "postgres";
ALTER TYPE "public"."registration_status" OWNER TO "postgres";
ALTER TYPE "public"."subscription_status" OWNER TO "postgres";
ALTER TYPE "public"."tournament_format" OWNER TO "postgres";
ALTER TYPE "public"."tournament_status" OWNER TO "postgres";
ALTER TYPE "public"."user_tier" OWNER TO "postgres";
