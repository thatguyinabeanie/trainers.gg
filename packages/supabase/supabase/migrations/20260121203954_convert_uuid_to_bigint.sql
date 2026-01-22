-- =============================================================================
-- Migration: Convert UUID columns to BIGINT with auto-increment (IDEMPOTENT)
-- =============================================================================
-- This migration converts all entity ID columns from UUID to BIGINT.
-- Exception: users.id stays UUID (must match auth.users.id)
--            profiles.user_id stays UUID (FK to users.id)
--
-- IMPORTANT: This migration is idempotent - it only runs if columns are UUID.
-- If columns are already BIGINT (e.g., from baseline), it skips the conversion.
-- =============================================================================

DO $$
DECLARE
  profiles_id_type text;
BEGIN
  -- Check if profiles.id is UUID (needs conversion) or already bigint (skip)
  SELECT data_type INTO profiles_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'id';

  -- If profiles.id is already bigint, skip the entire migration
  IF profiles_id_type = 'bigint' THEN
    RAISE NOTICE 'Columns are already BIGINT, skipping UUID to BIGINT conversion';
    RETURN;
  END IF;

  -- If we get here, columns are UUID and need conversion
  RAISE NOTICE 'Converting UUID columns to BIGINT...';

  -- =============================================================================
  -- STEP 1: Drop all foreign key constraints
  -- =============================================================================

  -- users table
  ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "users_main_profile_fk";

  -- organizations table
  ALTER TABLE "public"."organizations" DROP CONSTRAINT IF EXISTS "organizations_owner_profile_id_fkey";

  -- organization_members table
  ALTER TABLE "public"."organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organization_id_fkey";
  ALTER TABLE "public"."organization_members" DROP CONSTRAINT IF EXISTS "organization_members_profile_id_fkey";

  -- organization_invitations table
  ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_organization_id_fkey";
  ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_invited_profile_id_fkey";
  ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_invited_by_profile_id_fkey";

  -- organization_requests table
  ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_created_organization_id_fkey";
  ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_requested_by_profile_id_fkey";
  ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_reviewed_by_profile_id_fkey";

  -- groups table
  ALTER TABLE "public"."groups" DROP CONSTRAINT IF EXISTS "groups_organization_id_fkey";

  -- group_roles table
  ALTER TABLE "public"."group_roles" DROP CONSTRAINT IF EXISTS "group_roles_group_id_fkey";
  ALTER TABLE "public"."group_roles" DROP CONSTRAINT IF EXISTS "group_roles_role_id_fkey";

  -- profile_group_roles table
  ALTER TABLE "public"."profile_group_roles" DROP CONSTRAINT IF EXISTS "profile_group_roles_profile_id_fkey";
  ALTER TABLE "public"."profile_group_roles" DROP CONSTRAINT IF EXISTS "profile_group_roles_group_role_id_fkey";

  -- role_permissions table
  ALTER TABLE "public"."role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
  ALTER TABLE "public"."role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";

  -- teams table
  ALTER TABLE "public"."teams" DROP CONSTRAINT IF EXISTS "teams_created_by_fkey";

  -- team_pokemon table
  ALTER TABLE "public"."team_pokemon" DROP CONSTRAINT IF EXISTS "team_pokemon_team_id_fkey";
  ALTER TABLE "public"."team_pokemon" DROP CONSTRAINT IF EXISTS "team_pokemon_pokemon_id_fkey";

  -- tournament_templates table
  ALTER TABLE "public"."tournament_templates" DROP CONSTRAINT IF EXISTS "tournament_templates_organization_id_fkey";
  ALTER TABLE "public"."tournament_templates" DROP CONSTRAINT IF EXISTS "tournament_templates_created_by_fkey";

  -- tournament_template_phases table
  ALTER TABLE "public"."tournament_template_phases" DROP CONSTRAINT IF EXISTS "tournament_template_phases_template_id_fkey";

  -- tournaments table
  ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_organization_id_fkey";
  ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_template_id_fkey";
  ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_current_phase_fk";
  ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_archived_by_fkey";

  -- tournament_phases table
  ALTER TABLE "public"."tournament_phases" DROP CONSTRAINT IF EXISTS "tournament_phases_tournament_id_fkey";

  -- tournament_rounds table
  ALTER TABLE "public"."tournament_rounds" DROP CONSTRAINT IF EXISTS "tournament_rounds_phase_id_fkey";

  -- tournament_registrations table
  ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_tournament_id_fkey";
  ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_profile_id_fkey";
  ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_team_fk";
  ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_rental_team_photo_verified_by_fkey";

  -- tournament_invitations table
  ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_tournament_id_fkey";
  ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_invited_profile_id_fkey";
  ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_invited_by_profile_id_fkey";
  ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_registration_id_fkey";

  -- tournament_matches table
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_round_id_fkey";
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_profile1_id_fkey";
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_profile2_id_fkey";
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_winner_profile_id_fkey";
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_staff_resolved_by_fkey";

  -- tournament_pairings table
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_tournament_id_fkey";
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_round_id_fkey";
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_match_id_fkey";
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_profile1_id_fkey";
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_profile2_id_fkey";

  -- tournament_standings table
  ALTER TABLE "public"."tournament_standings" DROP CONSTRAINT IF EXISTS "tournament_standings_tournament_id_fkey";
  ALTER TABLE "public"."tournament_standings" DROP CONSTRAINT IF EXISTS "tournament_standings_profile_id_fkey";

  -- tournament_player_stats table
  ALTER TABLE "public"."tournament_player_stats" DROP CONSTRAINT IF EXISTS "tournament_player_stats_tournament_id_fkey";
  ALTER TABLE "public"."tournament_player_stats" DROP CONSTRAINT IF EXISTS "tournament_player_stats_profile_id_fkey";

  -- tournament_opponent_history table
  ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_tournament_id_fkey";
  ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_profile_id_fkey";
  ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_opponent_id_fkey";

  -- tournament_events table
  ALTER TABLE "public"."tournament_events" DROP CONSTRAINT IF EXISTS "tournament_events_tournament_id_fkey";
  ALTER TABLE "public"."tournament_events" DROP CONSTRAINT IF EXISTS "tournament_events_created_by_fkey";

  -- tournament_registration_pokemon table
  ALTER TABLE "public"."tournament_registration_pokemon" DROP CONSTRAINT IF EXISTS "tournament_registration_pokemon_tournament_registration_id_fkey";
  ALTER TABLE "public"."tournament_registration_pokemon" DROP CONSTRAINT IF EXISTS "tournament_registration_pokemon_pokemon_id_fkey";

  -- =============================================================================
  -- STEP 2: Drop primary key constraints (needed to change column type)
  -- =============================================================================

  ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_pkey";
  ALTER TABLE "public"."organizations" DROP CONSTRAINT IF EXISTS "organizations_pkey";
  ALTER TABLE "public"."organization_members" DROP CONSTRAINT IF EXISTS "organization_members_pkey";
  ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_pkey";
  ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_pkey";
  ALTER TABLE "public"."groups" DROP CONSTRAINT IF EXISTS "groups_pkey";
  ALTER TABLE "public"."group_roles" DROP CONSTRAINT IF EXISTS "group_roles_pkey";
  ALTER TABLE "public"."profile_group_roles" DROP CONSTRAINT IF EXISTS "profile_group_roles_pkey";
  ALTER TABLE "public"."roles" DROP CONSTRAINT IF EXISTS "roles_pkey";
  ALTER TABLE "public"."permissions" DROP CONSTRAINT IF EXISTS "permissions_pkey";
  ALTER TABLE "public"."role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_pkey";
  ALTER TABLE "public"."pokemon" DROP CONSTRAINT IF EXISTS "pokemon_pkey";
  ALTER TABLE "public"."teams" DROP CONSTRAINT IF EXISTS "teams_pkey";
  ALTER TABLE "public"."team_pokemon" DROP CONSTRAINT IF EXISTS "team_pokemon_pkey";
  ALTER TABLE "public"."tournament_templates" DROP CONSTRAINT IF EXISTS "tournament_templates_pkey";
  ALTER TABLE "public"."tournament_template_phases" DROP CONSTRAINT IF EXISTS "tournament_template_phases_pkey";
  ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_pkey";
  ALTER TABLE "public"."tournament_phases" DROP CONSTRAINT IF EXISTS "tournament_phases_pkey";
  ALTER TABLE "public"."tournament_rounds" DROP CONSTRAINT IF EXISTS "tournament_rounds_pkey";
  ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_pkey";
  ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_pkey";
  ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_pkey";
  ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_pkey";
  ALTER TABLE "public"."tournament_standings" DROP CONSTRAINT IF EXISTS "tournament_standings_pkey";
  ALTER TABLE "public"."tournament_player_stats" DROP CONSTRAINT IF EXISTS "tournament_player_stats_pkey";
  ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_pkey";
  ALTER TABLE "public"."tournament_events" DROP CONSTRAINT IF EXISTS "tournament_events_pkey";
  ALTER TABLE "public"."tournament_registration_pokemon" DROP CONSTRAINT IF EXISTS "tournament_registration_pokemon_pkey";

  -- =============================================================================
  -- STEP 3: Create sequences for auto-increment
  -- =============================================================================

  CREATE SEQUENCE IF NOT EXISTS "public"."profiles_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."organizations_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."organization_members_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."organization_invitations_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."organization_requests_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."groups_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."group_roles_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."profile_group_roles_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."roles_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."permissions_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."role_permissions_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."pokemon_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."teams_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."team_pokemon_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_templates_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_template_phases_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournaments_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_phases_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_rounds_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_registrations_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_invitations_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_matches_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_pairings_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_standings_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_player_stats_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_opponent_history_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_events_id_seq";
  CREATE SEQUENCE IF NOT EXISTS "public"."tournament_registration_pokemon_id_seq";

  -- =============================================================================
  -- STEP 4: Convert UUID columns to BIGINT
  -- =============================================================================

  -- profiles table (id only, user_id stays UUID)
  ALTER TABLE "public"."profiles" 
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('profiles_id_seq');

  -- users table (main_profile_id only, id stays UUID)
  ALTER TABLE "public"."users"
    ALTER COLUMN "main_profile_id" TYPE bigint USING NULL;

  -- organizations table
  ALTER TABLE "public"."organizations"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('organizations_id_seq'),
    ALTER COLUMN "owner_profile_id" TYPE bigint USING NULL;

  -- organization_members table
  ALTER TABLE "public"."organization_members"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('organization_members_id_seq'),
    ALTER COLUMN "organization_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile_id" TYPE bigint USING NULL;

  -- organization_invitations table
  ALTER TABLE "public"."organization_invitations"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('organization_invitations_id_seq'),
    ALTER COLUMN "organization_id" TYPE bigint USING NULL,
    ALTER COLUMN "invited_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "invited_by_profile_id" TYPE bigint USING NULL;

  -- organization_requests table
  ALTER TABLE "public"."organization_requests"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('organization_requests_id_seq'),
    ALTER COLUMN "requested_by_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "reviewed_by_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "created_organization_id" TYPE bigint USING NULL;

  -- groups table
  ALTER TABLE "public"."groups"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('groups_id_seq'),
    ALTER COLUMN "organization_id" TYPE bigint USING NULL;

  -- roles table
  ALTER TABLE "public"."roles"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('roles_id_seq');

  -- permissions table
  ALTER TABLE "public"."permissions"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('permissions_id_seq');

  -- group_roles table
  ALTER TABLE "public"."group_roles"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('group_roles_id_seq'),
    ALTER COLUMN "group_id" TYPE bigint USING NULL,
    ALTER COLUMN "role_id" TYPE bigint USING NULL;

  -- profile_group_roles table
  ALTER TABLE "public"."profile_group_roles"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('profile_group_roles_id_seq'),
    ALTER COLUMN "profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "group_role_id" TYPE bigint USING NULL;

  -- role_permissions table
  ALTER TABLE "public"."role_permissions"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('role_permissions_id_seq'),
    ALTER COLUMN "role_id" TYPE bigint USING NULL,
    ALTER COLUMN "permission_id" TYPE bigint USING NULL;

  -- pokemon table
  ALTER TABLE "public"."pokemon"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('pokemon_id_seq');

  -- teams table
  ALTER TABLE "public"."teams"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('teams_id_seq'),
    ALTER COLUMN "created_by" TYPE bigint USING NULL;

  -- team_pokemon table
  ALTER TABLE "public"."team_pokemon"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('team_pokemon_id_seq'),
    ALTER COLUMN "team_id" TYPE bigint USING NULL,
    ALTER COLUMN "pokemon_id" TYPE bigint USING NULL;

  -- tournament_templates table
  ALTER TABLE "public"."tournament_templates"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_templates_id_seq'),
    ALTER COLUMN "organization_id" TYPE bigint USING NULL,
    ALTER COLUMN "created_by" TYPE bigint USING NULL;

  -- tournament_template_phases table
  ALTER TABLE "public"."tournament_template_phases"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_template_phases_id_seq'),
    ALTER COLUMN "template_id" TYPE bigint USING NULL;

  -- tournaments table
  ALTER TABLE "public"."tournaments"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournaments_id_seq'),
    ALTER COLUMN "organization_id" TYPE bigint USING NULL,
    ALTER COLUMN "template_id" TYPE bigint USING NULL,
    ALTER COLUMN "current_phase_id" TYPE bigint USING NULL,
    ALTER COLUMN "archived_by" TYPE bigint USING NULL;

  -- tournament_phases table
  ALTER TABLE "public"."tournament_phases"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_phases_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL;

  -- tournament_rounds table
  ALTER TABLE "public"."tournament_rounds"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_rounds_id_seq'),
    ALTER COLUMN "phase_id" TYPE bigint USING NULL;

  -- tournament_registrations table
  ALTER TABLE "public"."tournament_registrations"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_registrations_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "team_id" TYPE bigint USING NULL,
    ALTER COLUMN "rental_team_photo_verified_by" TYPE bigint USING NULL;

  -- tournament_invitations table
  ALTER TABLE "public"."tournament_invitations"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_invitations_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "invited_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "invited_by_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "registration_id" TYPE bigint USING NULL;

  -- tournament_matches table
  ALTER TABLE "public"."tournament_matches"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_matches_id_seq'),
    ALTER COLUMN "round_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile1_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile2_id" TYPE bigint USING NULL,
    ALTER COLUMN "winner_profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "staff_resolved_by" TYPE bigint USING NULL;

  -- tournament_pairings table
  ALTER TABLE "public"."tournament_pairings"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_pairings_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "round_id" TYPE bigint USING NULL,
    ALTER COLUMN "match_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile1_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile2_id" TYPE bigint USING NULL;

  -- tournament_standings table
  ALTER TABLE "public"."tournament_standings"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_standings_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile_id" TYPE bigint USING NULL;

  -- tournament_player_stats table
  ALTER TABLE "public"."tournament_player_stats"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_player_stats_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile_id" TYPE bigint USING NULL;

  -- tournament_opponent_history table
  ALTER TABLE "public"."tournament_opponent_history"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_opponent_history_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "profile_id" TYPE bigint USING NULL,
    ALTER COLUMN "opponent_id" TYPE bigint USING NULL;

  -- tournament_events table
  ALTER TABLE "public"."tournament_events"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_events_id_seq'),
    ALTER COLUMN "tournament_id" TYPE bigint USING NULL,
    ALTER COLUMN "created_by" TYPE bigint USING NULL;

  -- tournament_registration_pokemon table
  ALTER TABLE "public"."tournament_registration_pokemon"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" TYPE bigint USING 1,
    ALTER COLUMN "id" SET DEFAULT nextval('tournament_registration_pokemon_id_seq'),
    ALTER COLUMN "tournament_registration_id" TYPE bigint USING NULL,
    ALTER COLUMN "pokemon_id" TYPE bigint USING NULL;

  -- =============================================================================
  -- STEP 5: Recreate primary key constraints
  -- =============================================================================

  ALTER TABLE "public"."profiles" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."organizations" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."organization_members" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."organization_invitations" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."organization_requests" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."groups" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."group_roles" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."profile_group_roles" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."roles" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."permissions" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."role_permissions" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."pokemon" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."teams" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."team_pokemon" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_templates" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_template_phases" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournaments" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_phases" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_rounds" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_registrations" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_invitations" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_matches" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_pairings" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_standings" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_player_stats" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_opponent_history" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_events" ADD PRIMARY KEY ("id");
  ALTER TABLE "public"."tournament_registration_pokemon" ADD PRIMARY KEY ("id");

  -- =============================================================================
  -- STEP 6: Recreate foreign key constraints
  -- =============================================================================

  -- users table
  ALTER TABLE "public"."users" 
    ADD CONSTRAINT "users_main_profile_fk" FOREIGN KEY ("main_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- organizations table
  ALTER TABLE "public"."organizations"
    ADD CONSTRAINT "organizations_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

  -- organization_members table
  ALTER TABLE "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "organization_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

  -- organization_invitations table
  ALTER TABLE "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "organization_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "organization_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- organization_requests table
  ALTER TABLE "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_requested_by_profile_id_fkey" FOREIGN KEY ("requested_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "organization_requests_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "organization_requests_created_organization_id_fkey" FOREIGN KEY ("created_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;

  -- groups table
  ALTER TABLE "public"."groups"
    ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

  -- group_roles table
  ALTER TABLE "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "group_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;

  -- profile_group_roles table
  ALTER TABLE "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "profile_group_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;

  -- role_permissions table
  ALTER TABLE "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;

  -- teams table
  ALTER TABLE "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- team_pokemon table
  ALTER TABLE "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "team_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;

  -- tournament_templates table
  ALTER TABLE "public"."tournament_templates"
    ADD CONSTRAINT "tournament_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_template_phases table
  ALTER TABLE "public"."tournament_template_phases"
    ADD CONSTRAINT "tournament_template_phases_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE CASCADE;

  -- tournaments table
  ALTER TABLE "public"."tournaments"
    ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournaments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournaments_current_phase_fk" FOREIGN KEY ("current_phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournaments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_phases table
  ALTER TABLE "public"."tournament_phases"
    ADD CONSTRAINT "tournament_phases_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;

  -- tournament_rounds table
  ALTER TABLE "public"."tournament_rounds"
    ADD CONSTRAINT "tournament_rounds_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE CASCADE;

  -- tournament_registrations table
  ALTER TABLE "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_registrations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_registrations_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_registrations_rental_team_photo_verified_by_fkey" FOREIGN KEY ("rental_team_photo_verified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_invitations table
  ALTER TABLE "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_invitations_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE SET NULL;

  -- tournament_matches table
  ALTER TABLE "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_matches_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_matches_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_matches_winner_profile_id_fkey" FOREIGN KEY ("winner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_matches_staff_resolved_by_fkey" FOREIGN KEY ("staff_resolved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_pairings table
  ALTER TABLE "public"."tournament_pairings"
    ADD CONSTRAINT "tournament_pairings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_pairings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_pairings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_pairings_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "tournament_pairings_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_standings table
  ALTER TABLE "public"."tournament_standings"
    ADD CONSTRAINT "tournament_standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_standings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

  -- tournament_player_stats table
  ALTER TABLE "public"."tournament_player_stats"
    ADD CONSTRAINT "tournament_player_stats_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_player_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

  -- tournament_opponent_history table
  ALTER TABLE "public"."tournament_opponent_history"
    ADD CONSTRAINT "tournament_opponent_history_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_opponent_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_opponent_history_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

  -- tournament_events table
  ALTER TABLE "public"."tournament_events"
    ADD CONSTRAINT "tournament_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

  -- tournament_registration_pokemon table
  ALTER TABLE "public"."tournament_registration_pokemon"
    ADD CONSTRAINT "tournament_registration_pokemon_tournament_registration_id_fkey" FOREIGN KEY ("tournament_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "tournament_registration_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;

  RAISE NOTICE 'UUID to BIGINT conversion completed successfully';
END $$;

-- =============================================================================
-- Always update helper functions to return BIGINT (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
$$;

-- =============================================================================
-- Always update the handle_new_user trigger function (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_profile_id bigint;
  v_username text;
  v_display_name text;
  v_avatar_url text;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract values from user_metadata, with fallbacks
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1)
  );
  
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    v_username
  );
  
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
    split_part(NEW.raw_user_meta_data->>'name', ' ', 1)
  );
  
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
    NULLIF(split_part(NEW.raw_user_meta_data->>'name', ' ', 2), '')
  );

  -- Insert into users table
  INSERT INTO public.users (id, email, first_name, last_name, username, image)
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name,
    v_username,
    v_avatar_url
  );

  -- Insert into profiles table and get the generated ID
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url
  )
  RETURNING id INTO new_profile_id;

  -- Update users table with the main_profile_id
  UPDATE public.users
  SET main_profile_id = new_profile_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
