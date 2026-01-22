-- =============================================================================
-- Grants and Default Privileges
-- =============================================================================
-- Schema, function, and table grants for all roles.
-- Note: All statements in this file are naturally idempotent:
-- - GRANT statements can be re-run without error
-- - ALTER DEFAULT PRIVILEGES can be re-run without error
-- - ALTER PUBLICATION OWNER can be re-run without error

-- =============================================================================
-- Publication
-- =============================================================================

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

-- =============================================================================
-- Schema Grants
-- =============================================================================

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

-- =============================================================================
-- Function Grants
-- =============================================================================

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

-- =============================================================================
-- Table Grants
-- =============================================================================

-- Users and Profiles
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";

-- Organizations
GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";

GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";

GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";

GRANT ALL ON TABLE "public"."organization_requests" TO "anon";
GRANT ALL ON TABLE "public"."organization_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_requests" TO "service_role";

-- RBAC
GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";

GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";

GRANT ALL ON TABLE "public"."group_roles" TO "anon";
GRANT ALL ON TABLE "public"."group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."group_roles" TO "service_role";

GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";

GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";

GRANT ALL ON TABLE "public"."profile_group_roles" TO "anon";
GRANT ALL ON TABLE "public"."profile_group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_group_roles" TO "service_role";

-- Subscriptions
GRANT ALL ON TABLE "public"."feature_usage" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage" TO "service_role";

GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";

-- Pokemon and Teams
GRANT ALL ON TABLE "public"."pokemon" TO "anon";
GRANT ALL ON TABLE "public"."pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon" TO "service_role";

GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."team_pokemon" TO "anon";
GRANT ALL ON TABLE "public"."team_pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."team_pokemon" TO "service_role";

-- Tournament Templates
GRANT ALL ON TABLE "public"."tournament_templates" TO "anon";
GRANT ALL ON TABLE "public"."tournament_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_templates" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_template_phases" TO "anon";
GRANT ALL ON TABLE "public"."tournament_template_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_template_phases" TO "service_role";

-- Tournaments
GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_phases" TO "anon";
GRANT ALL ON TABLE "public"."tournament_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_phases" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_rounds" TO "anon";
GRANT ALL ON TABLE "public"."tournament_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_rounds" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_matches" TO "anon";
GRANT ALL ON TABLE "public"."tournament_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_matches" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_pairings" TO "anon";
GRANT ALL ON TABLE "public"."tournament_pairings" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_pairings" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_registrations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registration_pokemon" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_invitations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_invitations" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_events" TO "anon";
GRANT ALL ON TABLE "public"."tournament_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_events" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_player_stats" TO "anon";
GRANT ALL ON TABLE "public"."tournament_player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_player_stats" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_standings" TO "anon";
GRANT ALL ON TABLE "public"."tournament_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_standings" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "anon";
GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_opponent_history" TO "service_role";

-- =============================================================================
-- Default Privileges
-- =============================================================================

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
