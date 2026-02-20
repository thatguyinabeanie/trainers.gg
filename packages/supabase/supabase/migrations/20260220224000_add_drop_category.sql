-- =============================================================================
-- Add drop_category enum and drop metadata columns to tournament_registrations
-- =============================================================================
-- Categorizes WHY a player was dropped from a tournament (no_show, conduct,
-- disqualification, other) with optional notes and audit trail.

-- Create drop_category enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drop_category') THEN
        CREATE TYPE "public"."drop_category" AS ENUM ('no_show', 'conduct', 'disqualification', 'other');
    END IF;
END $$;

-- Set ownership
ALTER TYPE "public"."drop_category" OWNER TO "postgres";

-- Add comment on the enum type
COMMENT ON TYPE "public"."drop_category" IS 'Reason category for dropping a player from a tournament';

-- Add drop metadata columns to tournament_registrations
ALTER TABLE "public"."tournament_registrations"
ADD COLUMN IF NOT EXISTS "drop_category" "public"."drop_category",
ADD COLUMN IF NOT EXISTS "drop_notes" text,
ADD COLUMN IF NOT EXISTS "dropped_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "dropped_at" timestamptz;

-- Add comments
COMMENT ON COLUMN "public"."tournament_registrations"."drop_category" IS 'Reason category for why the player was dropped (no_show, conduct, disqualification, other)';
COMMENT ON COLUMN "public"."tournament_registrations"."drop_notes" IS 'Free-text notes explaining why the player was dropped';
COMMENT ON COLUMN "public"."tournament_registrations"."dropped_by" IS 'User ID of the staff member who dropped the player';
COMMENT ON COLUMN "public"."tournament_registrations"."dropped_at" IS 'Timestamp when the player was dropped from the tournament';
