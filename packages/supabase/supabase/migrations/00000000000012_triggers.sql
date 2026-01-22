-- =============================================================================
-- Triggers
-- =============================================================================
-- Automatic triggers for updated_at timestamps and auth user creation.
-- Uses CREATE OR REPLACE TRIGGER for idempotency (PostgreSQL 14+).

-- Updated at triggers
CREATE OR REPLACE TRIGGER "update_users_updated_at" 
    BEFORE UPDATE ON "public"."users" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_profiles_updated_at" 
    BEFORE UPDATE ON "public"."profiles" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_organizations_updated_at" 
    BEFORE UPDATE ON "public"."organizations" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_feature_usage_updated_at" 
    BEFORE UPDATE ON "public"."feature_usage" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" 
    BEFORE UPDATE ON "public"."subscriptions" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_teams_updated_at" 
    BEFORE UPDATE ON "public"."teams" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_tournament_templates_updated_at" 
    BEFORE UPDATE ON "public"."tournament_templates" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_tournaments_updated_at" 
    BEFORE UPDATE ON "public"."tournaments" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_tournament_player_stats_updated_at" 
    BEFORE UPDATE ON "public"."tournament_player_stats" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Auth trigger for new user creation
-- This trigger automatically creates user and profile records when a new auth user signs up.
-- Note: CREATE OR REPLACE TRIGGER doesn't work on auth schema tables in some Supabase versions,
-- so we use DROP IF EXISTS + CREATE for idempotency.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
