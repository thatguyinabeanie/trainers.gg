-- =============================================================================
-- Helper Functions (IDEMPOTENT)
-- =============================================================================
-- Utility functions used throughout the application for auth, triggers, etc.
-- Uses CREATE OR REPLACE for idempotency.
-- 
-- NOTE: get_current_profile_id() and handle_new_user() reference the profiles
-- table, so they are defined here but will only work after tables are created.
-- The CREATE OR REPLACE ensures they can be redefined later if needed.

-- Trigger function to automatically update updated_at timestamp
-- This doesn't reference any tables, so it's safe to create first
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

-- Get the current authenticated user's ID (auth.uid wrapper)
-- This doesn't reference any tables, so it's safe to create first
CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT auth.uid();
$$;
ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";

-- Set table access method default
SET default_tablespace = '';
SET default_table_access_method = "heap";
