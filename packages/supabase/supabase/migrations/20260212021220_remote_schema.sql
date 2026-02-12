-- Make sequences idempotent - only create if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'alts_id_seq') THEN
    CREATE SEQUENCE public.alts_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'group_roles_id_seq') THEN
    CREATE SEQUENCE public.group_roles_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'groups_id_seq') THEN
    CREATE SEQUENCE public.groups_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'organization_invitations_id_seq') THEN
    CREATE SEQUENCE public.organization_invitations_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'organization_requests_id_seq') THEN
    CREATE SEQUENCE public.organization_requests_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'organization_staff_id_seq') THEN
    CREATE SEQUENCE public.organization_staff_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'organizations_id_seq') THEN
    CREATE SEQUENCE public.organizations_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'permissions_id_seq') THEN
    CREATE SEQUENCE public.permissions_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'pokemon_id_seq') THEN
    CREATE SEQUENCE public.pokemon_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'role_permissions_id_seq') THEN
    CREATE SEQUENCE public.role_permissions_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'roles_id_seq') THEN
    CREATE SEQUENCE public.roles_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'team_pokemon_id_seq') THEN
    CREATE SEQUENCE public.team_pokemon_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'teams_id_seq') THEN
    CREATE SEQUENCE public.teams_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_events_id_seq') THEN
    CREATE SEQUENCE public.tournament_events_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_invitations_id_seq') THEN
    CREATE SEQUENCE public.tournament_invitations_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_matches_id_seq') THEN
    CREATE SEQUENCE public.tournament_matches_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_opponent_history_id_seq') THEN
    CREATE SEQUENCE public.tournament_opponent_history_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_pairings_id_seq') THEN
    CREATE SEQUENCE public.tournament_pairings_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_phases_id_seq') THEN
    CREATE SEQUENCE public.tournament_phases_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_player_stats_id_seq') THEN
    CREATE SEQUENCE public.tournament_player_stats_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_registration_pokemon_id_seq') THEN
    CREATE SEQUENCE public.tournament_registration_pokemon_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_registrations_id_seq') THEN
    CREATE SEQUENCE public.tournament_registrations_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_rounds_id_seq') THEN
    CREATE SEQUENCE public.tournament_rounds_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_standings_id_seq') THEN
    CREATE SEQUENCE public.tournament_standings_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_template_phases_id_seq') THEN
    CREATE SEQUENCE public.tournament_template_phases_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournament_templates_id_seq') THEN
    CREATE SEQUENCE public.tournament_templates_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tournaments_id_seq') THEN
    CREATE SEQUENCE public.tournaments_id_seq;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_group_roles_id_seq') THEN
    CREATE SEQUENCE public.user_group_roles_id_seq;
  END IF;
END $$;

-- Drop pg_net extension if it exists (idempotent)
DROP EXTENSION IF EXISTS "pg_net";

-- Drop constraints if they exist (idempotent)
ALTER TABLE IF EXISTS "public"."organization_requests"
  DROP CONSTRAINT IF EXISTS "organization_requests_created_organization_id_fkey";

ALTER TABLE IF EXISTS "public"."tournament_templates"
  DROP CONSTRAINT IF EXISTS "tournament_templates_organization_id_fkey";

-- Update column defaults and drop identity - wrapped in DO blocks for idempotency
-- Note: These operations are idempotent because:
-- - SET DEFAULT is idempotent (setting same default is a no-op)
-- - DROP IDENTITY IF EXISTS handles the case where identity was already dropped

DO $$ BEGIN
  -- alts
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alts' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alts' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."alts" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."alts" ALTER COLUMN "id" SET DEFAULT nextval('public.alts_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- feature_usage - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    -- Only change type if not already uuid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id' AND data_type = 'uuid') THEN
      ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;
    END IF;
    ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
  END IF;
END $$;

DO $$ BEGIN
  -- group_roles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'group_roles' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'group_roles' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."group_roles" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."group_roles" ALTER COLUMN "id" SET DEFAULT nextval('public.group_roles_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- groups
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."groups" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."groups" ALTER COLUMN "id" SET DEFAULT nextval('public.groups_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- organization_invitations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_invitations' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_invitations' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."organization_invitations" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."organization_invitations" ALTER COLUMN "id" SET DEFAULT nextval('public.organization_invitations_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- organization_requests
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_requests' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_requests' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."organization_requests" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."organization_requests" ALTER COLUMN "id" SET DEFAULT nextval('public.organization_requests_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- organization_staff
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_staff' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_staff' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."organization_staff" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."organization_staff" ALTER COLUMN "id" SET DEFAULT nextval('public.organization_staff_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- organizations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."organizations" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."organizations" ALTER COLUMN "id" SET DEFAULT nextval('public.organizations_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- permissions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."permissions" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."permissions" ALTER COLUMN "id" SET DEFAULT nextval('public.permissions_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- pokemon
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pokemon' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pokemon' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."pokemon" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."pokemon" ALTER COLUMN "id" SET DEFAULT nextval('public.pokemon_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- rate_limits - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id' AND data_type = 'uuid') THEN
      ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;
    END IF;
    ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
  END IF;
END $$;

DO $$ BEGIN
  -- role_permissions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."role_permissions" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."role_permissions" ALTER COLUMN "id" SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- roles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."roles" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."roles" ALTER COLUMN "id" SET DEFAULT nextval('public.roles_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- subscriptions - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id' AND data_type = 'uuid') THEN
      ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;
    END IF;
    ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
  END IF;
END $$;

DO $$ BEGIN
  -- team_pokemon
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_pokemon' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_pokemon' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."team_pokemon" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."team_pokemon" ALTER COLUMN "id" SET DEFAULT nextval('public.team_pokemon_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- teams
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."teams" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."teams" ALTER COLUMN "id" SET DEFAULT nextval('public.teams_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_events
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_events' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_events' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_events" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_events" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_events_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_invitations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_invitations' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_invitations' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_invitations" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_invitations" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_invitations_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_matches
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_matches' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_matches' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_matches" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_matches" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_matches_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_opponent_history
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_opponent_history' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_opponent_history' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_opponent_history" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_opponent_history" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_opponent_history_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_pairings
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_pairings' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_pairings' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_pairings" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_pairings" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_pairings_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_phases
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_phases' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_phases' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_phases" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_phases" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_phases_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_player_stats
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_player_stats_id_seq'::regclass);
  END IF;
  -- Handle opponent_history column type change
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'opponent_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'opponent_history' AND data_type = 'ARRAY') THEN
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" SET DATA TYPE uuid[] USING "opponent_history"::uuid[];
    END IF;
    ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" SET DEFAULT '{}'::uuid[];
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_registration_pokemon
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_registration_pokemon' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_registration_pokemon' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_registration_pokemon" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_registration_pokemon" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_registration_pokemon_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_registrations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_registrations' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_registrations' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_registrations" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_registrations" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_registrations_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_rounds
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_rounds' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_rounds' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_rounds" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_rounds" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_rounds_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_standings
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_standings' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_standings' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_standings" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_standings" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_standings_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_template_phases
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_template_phases' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_template_phases' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_template_phases" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_template_phases" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_template_phases_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournament_templates
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_templates' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_templates' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournament_templates" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournament_templates" ALTER COLUMN "id" SET DEFAULT nextval('public.tournament_templates_id_seq'::regclass);
  END IF;
END $$;

DO $$ BEGIN
  -- tournaments
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."tournaments" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."tournaments" ALTER COLUMN "id" SET DEFAULT nextval('public.tournaments_id_seq'::regclass);
  END IF;
  -- Handle participants column type change
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'participants') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'participants' AND data_type = 'ARRAY') THEN
      ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" SET DATA TYPE uuid[] USING "participants"::uuid[];
    END IF;
    ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" SET DEFAULT '{}'::uuid[];
  END IF;
END $$;

DO $$ BEGIN
  -- user_group_roles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_group_roles' AND column_name = 'id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_group_roles' AND column_name = 'id' AND is_identity = 'YES') THEN
      ALTER TABLE "public"."user_group_roles" ALTER COLUMN "id" DROP IDENTITY;
    END IF;
    ALTER TABLE "public"."user_group_roles" ALTER COLUMN "id" SET DEFAULT nextval('public.user_group_roles_id_seq'::regclass);
  END IF;
END $$;

-- Add foreign key constraints (idempotent - DROP IF EXISTS then ADD)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_requests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_requests' AND column_name = 'created_organization_id') THEN
      ALTER TABLE "public"."organization_requests"
        ADD CONSTRAINT "organization_requests_created_organization_id_fkey"
        FOREIGN KEY (created_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL NOT VALID;
      ALTER TABLE "public"."organization_requests" VALIDATE CONSTRAINT "organization_requests_created_organization_id_fkey";
    END IF;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_templates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_templates' AND column_name = 'organization_id') THEN
      ALTER TABLE "public"."tournament_templates"
        ADD CONSTRAINT "tournament_templates_organization_id_fkey"
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE "public"."tournament_templates" VALIDATE CONSTRAINT "tournament_templates_organization_id_fkey";
    END IF;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists
END $$;

-- Functions (CREATE OR REPLACE is inherently idempotent)
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    claims jsonb;
    _user_id uuid;
    _site_roles text[];
  BEGIN
    _user_id := (event->>'user_id')::uuid;

    SELECT ARRAY_AGG(r.name)
    INTO _site_roles
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.scope = 'site';

    claims := event->'claims';
    claims := jsonb_set(claims, '{site_roles}', COALESCE(to_jsonb(_site_roles), '[]'::jsonb));

    RETURN jsonb_set(event, '{claims}', claims);
  END;
$function$;

CREATE OR REPLACE FUNCTION public.register_for_tournament_atomic(p_tournament_id bigint, p_alt_id bigint DEFAULT NULL::bigint, p_team_name text DEFAULT NULL::text, p_in_game_name text DEFAULT NULL::text, p_display_name_option text DEFAULT NULL::text, p_show_country_flag boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_alt record;
  v_tournament record;
  v_existing_registration_id bigint;
  v_current_count integer;
  v_registration_status public.registration_status;
  v_new_registration_id bigint;
  v_is_registration_open boolean;
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get user's alt
  IF p_alt_id IS NOT NULL THEN
    SELECT a.id, a.user_id
    INTO v_alt
    FROM public.alts a
    WHERE a.id = p_alt_id AND a.user_id = v_user_id;
  ELSE
    SELECT a.id, a.user_id
    INTO v_alt
    FROM public.alts a
    WHERE a.user_id = v_user_id
      AND a.id = (SELECT u.main_alt_id FROM public.users u WHERE u.id = v_user_id)
    LIMIT 1;
  END IF;

  IF v_alt IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to load your account. Please try signing out and back in, or contact support.'
    );
  END IF;

  -- Check if already registered
  SELECT tr.id
  INTO v_existing_registration_id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = p_tournament_id
    AND tr.alt_id = v_alt.id;

  IF v_existing_registration_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already registered for this tournament'
    );
  END IF;

  -- Lock tournament row and get details (prevents TOCTOU race)
  -- FIXED: Removed non-existent columns registration_start, registration_end, check_in_start
  SELECT t.id, t.status, t.max_participants, t.allow_late_registration
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tournament not found'
    );
  END IF;

  -- Check if registration is open
  -- Matches logic from checkRegistrationOpen in utils/registration.ts
  v_is_registration_open := (
    v_tournament.status = 'draft'
    OR v_tournament.status = 'upcoming'
    OR (v_tournament.status = 'active' AND v_tournament.allow_late_registration = true)
  );

  IF NOT v_is_registration_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tournament is not open for registration'
    );
  END IF;

  -- Atomically count current registered players
  -- This count happens while holding the tournament lock, preventing race conditions
  SELECT COUNT(*)::integer
  INTO v_current_count
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = p_tournament_id
    AND tr.status = 'registered';

  -- Determine registration status based on capacity
  IF v_tournament.max_participants IS NOT NULL
     AND v_current_count >= v_tournament.max_participants THEN
    -- Tournament is full - add to waitlist
    v_registration_status := 'waitlist';
  ELSE
    -- Spot available - register
    v_registration_status := 'registered';
  END IF;

  -- Insert registration
  INSERT INTO public.tournament_registrations (
    tournament_id,
    alt_id,
    status,
    registered_at,
    team_name,
    in_game_name,
    display_name_option,
    show_country_flag
  ) VALUES (
    p_tournament_id,
    v_alt.id,
    v_registration_status,
    now(),
    p_team_name,
    p_in_game_name,
    p_display_name_option,
    p_show_country_flag
  )
  RETURNING id INTO v_new_registration_id;

  -- Return success with registration details
  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_registration_id,
    'status', v_registration_status
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log actual error server-side for debugging
    RAISE WARNING 'register_for_tournament_atomic failed for tournament % alt %: %',
      p_tournament_id, p_alt_id, SQLERRM;

    -- Return generic client-safe message
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration failed. Please try again or contact support if the issue persists.'
    );
END;
$function$;
