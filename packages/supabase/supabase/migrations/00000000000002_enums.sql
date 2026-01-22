-- =============================================================================
-- Enum Types
-- =============================================================================
-- All custom enum types used throughout the application.

-- Billing
CREATE TYPE "public"."billing_interval" AS ENUM (
    'monthly',
    'annual'
);
ALTER TYPE "public"."billing_interval" OWNER TO "postgres";

-- Entity types for polymorphic relationships
CREATE TYPE "public"."entity_type" AS ENUM (
    'profile',
    'organization'
);
ALTER TYPE "public"."entity_type" OWNER TO "postgres";

-- Invitation status
CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);
ALTER TYPE "public"."invitation_status" OWNER TO "postgres";

-- Organization request status
CREATE TYPE "public"."org_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);
ALTER TYPE "public"."org_request_status" OWNER TO "postgres";

-- Organization status
CREATE TYPE "public"."organization_status" AS ENUM (
    'pending',
    'active',
    'rejected'
);
ALTER TYPE "public"."organization_status" OWNER TO "postgres";

-- Organization subscription tier
CREATE TYPE "public"."organization_subscription_tier" AS ENUM (
    'free',
    'organization_plus',
    'enterprise'
);
ALTER TYPE "public"."organization_subscription_tier" OWNER TO "postgres";

-- Organization tier (verification level)
CREATE TYPE "public"."organization_tier" AS ENUM (
    'regular',
    'verified',
    'partner'
);
ALTER TYPE "public"."organization_tier" OWNER TO "postgres";

-- Phase status (tournaments, rounds)
CREATE TYPE "public"."phase_status" AS ENUM (
    'pending',
    'active',
    'completed'
);
ALTER TYPE "public"."phase_status" OWNER TO "postgres";

-- Pokemon gender
CREATE TYPE "public"."pokemon_gender" AS ENUM (
    'Male',
    'Female'
);
ALTER TYPE "public"."pokemon_gender" OWNER TO "postgres";

-- Tournament registration status
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

-- Subscription status
CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'cancelled',
    'expired',
    'past_due'
);
ALTER TYPE "public"."subscription_status" OWNER TO "postgres";

-- Tournament format
CREATE TYPE "public"."tournament_format" AS ENUM (
    'swiss_only',
    'swiss_with_cut',
    'single_elimination',
    'double_elimination'
);
ALTER TYPE "public"."tournament_format" OWNER TO "postgres";

-- Tournament status
CREATE TYPE "public"."tournament_status" AS ENUM (
    'draft',
    'upcoming',
    'active',
    'paused',
    'completed',
    'cancelled'
);
ALTER TYPE "public"."tournament_status" OWNER TO "postgres";

-- User subscription tier
CREATE TYPE "public"."user_tier" AS ENUM (
    'free',
    'player_pro',
    'coach_premium'
);
ALTER TYPE "public"."user_tier" OWNER TO "postgres";
