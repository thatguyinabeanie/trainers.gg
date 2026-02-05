-- =============================================================================
-- Add sprite_preference to users table
-- =============================================================================
-- Allows users to select their preferred Pokemon sprite style.
-- Options: gen5 (pixel), gen5ani (animated pixel), ani (modern animated)

-- Create sprite_preference enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sprite_preference') THEN
        CREATE TYPE "public"."sprite_preference" AS ENUM ('gen5', 'gen5ani', 'ani');
    END IF;
END $$;

-- Set ownership
ALTER TYPE "public"."sprite_preference" OWNER TO "postgres";

-- Add sprite_preference column to users table
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "sprite_preference" "public"."sprite_preference" DEFAULT 'gen5';

-- Add comment
COMMENT ON COLUMN "public"."users"."sprite_preference" IS 'User preferred Pokemon sprite style: gen5 (static pixel), gen5ani (animated pixel), ani (modern animated)';
