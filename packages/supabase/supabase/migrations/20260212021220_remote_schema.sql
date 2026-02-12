-- Migration to sync schema from production
-- All operations are wrapped to be idempotent and handle fresh databases
--
-- IMPORTANT: IDENTITY columns have underlying sequences that get DROPPED when
-- you DROP IDENTITY. So we must:
-- 1. First DROP IDENTITY on all columns
-- 2. Then CREATE sequences (because DROP IDENTITY deleted them)
-- 3. Then SET DEFAULT to use the sequences

-- Note: pg_net extension is managed by Supabase Cloud and cannot be dropped by users.
-- Skipping DROP EXTENSION "pg_net" to avoid permission errors on Supabase Cloud.

-- Drop constraints if they exist (idempotent)
ALTER TABLE IF EXISTS "public"."organization_requests"
  DROP CONSTRAINT IF EXISTS "organization_requests_created_organization_id_fkey";

ALTER TABLE IF EXISTS "public"."tournament_templates"
  DROP CONSTRAINT IF EXISTS "tournament_templates_organization_id_fkey";

-- Step 1: Drop all IDENTITY columns first (this also drops their underlying sequences)
DO $$
DECLARE
  tables_cols text[][] := ARRAY[
    ARRAY['alts', 'id'],
    ARRAY['group_roles', 'id'],
    ARRAY['groups', 'id'],
    ARRAY['organization_invitations', 'id'],
    ARRAY['organization_requests', 'id'],
    ARRAY['organization_staff', 'id'],
    ARRAY['organizations', 'id'],
    ARRAY['permissions', 'id'],
    ARRAY['pokemon', 'id'],
    ARRAY['role_permissions', 'id'],
    ARRAY['roles', 'id'],
    ARRAY['team_pokemon', 'id'],
    ARRAY['teams', 'id'],
    ARRAY['tournament_events', 'id'],
    ARRAY['tournament_invitations', 'id'],
    ARRAY['tournament_matches', 'id'],
    ARRAY['tournament_opponent_history', 'id'],
    ARRAY['tournament_pairings', 'id'],
    ARRAY['tournament_phases', 'id'],
    ARRAY['tournament_player_stats', 'id'],
    ARRAY['tournament_registration_pokemon', 'id'],
    ARRAY['tournament_registrations', 'id'],
    ARRAY['tournament_rounds', 'id'],
    ARRAY['tournament_standings', 'id'],
    ARRAY['tournament_template_phases', 'id'],
    ARRAY['tournament_templates', 'id'],
    ARRAY['tournaments', 'id'],
    ARRAY['user_group_roles', 'id']
  ];
  i int;
  tbl_name text;
  col_name text;
BEGIN
  FOR i IN 1..array_length(tables_cols, 1) LOOP
    tbl_name := tables_cols[i][1];
    col_name := tables_cols[i][2];
    
    -- Drop identity if column exists and is an identity column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = tbl_name 
        AND column_name = col_name 
        AND is_identity = 'YES'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP IDENTITY', tbl_name, col_name);
    END IF;
  END LOOP;
END $$;

-- Step 2: Create sequences (they were deleted when we dropped IDENTITY)
DO $$ 
DECLARE
  seqs text[] := ARRAY[
    'alts_id_seq', 'group_roles_id_seq', 'groups_id_seq', 'organization_invitations_id_seq',
    'organization_requests_id_seq', 'organization_staff_id_seq', 'organizations_id_seq',
    'permissions_id_seq', 'pokemon_id_seq', 'role_permissions_id_seq', 'roles_id_seq',
    'team_pokemon_id_seq', 'teams_id_seq', 'tournament_events_id_seq', 'tournament_invitations_id_seq',
    'tournament_matches_id_seq', 'tournament_opponent_history_id_seq', 'tournament_pairings_id_seq',
    'tournament_phases_id_seq', 'tournament_player_stats_id_seq', 'tournament_registration_pokemon_id_seq',
    'tournament_registrations_id_seq', 'tournament_rounds_id_seq', 'tournament_standings_id_seq',
    'tournament_template_phases_id_seq', 'tournament_templates_id_seq', 'tournaments_id_seq',
    'user_group_roles_id_seq'
  ];
  seq_name text;
BEGIN
  FOREACH seq_name IN ARRAY seqs LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
      EXECUTE format('CREATE SEQUENCE public.%I', seq_name);
    END IF;
  END LOOP;
END $$;

-- Step 3: Set defaults to use the sequences
DO $$
DECLARE
  tables_cols_seqs text[][] := ARRAY[
    ARRAY['alts', 'id', 'alts_id_seq'],
    ARRAY['group_roles', 'id', 'group_roles_id_seq'],
    ARRAY['groups', 'id', 'groups_id_seq'],
    ARRAY['organization_invitations', 'id', 'organization_invitations_id_seq'],
    ARRAY['organization_requests', 'id', 'organization_requests_id_seq'],
    ARRAY['organization_staff', 'id', 'organization_staff_id_seq'],
    ARRAY['organizations', 'id', 'organizations_id_seq'],
    ARRAY['permissions', 'id', 'permissions_id_seq'],
    ARRAY['pokemon', 'id', 'pokemon_id_seq'],
    ARRAY['role_permissions', 'id', 'role_permissions_id_seq'],
    ARRAY['roles', 'id', 'roles_id_seq'],
    ARRAY['team_pokemon', 'id', 'team_pokemon_id_seq'],
    ARRAY['teams', 'id', 'teams_id_seq'],
    ARRAY['tournament_events', 'id', 'tournament_events_id_seq'],
    ARRAY['tournament_invitations', 'id', 'tournament_invitations_id_seq'],
    ARRAY['tournament_matches', 'id', 'tournament_matches_id_seq'],
    ARRAY['tournament_opponent_history', 'id', 'tournament_opponent_history_id_seq'],
    ARRAY['tournament_pairings', 'id', 'tournament_pairings_id_seq'],
    ARRAY['tournament_phases', 'id', 'tournament_phases_id_seq'],
    ARRAY['tournament_player_stats', 'id', 'tournament_player_stats_id_seq'],
    ARRAY['tournament_registration_pokemon', 'id', 'tournament_registration_pokemon_id_seq'],
    ARRAY['tournament_registrations', 'id', 'tournament_registrations_id_seq'],
    ARRAY['tournament_rounds', 'id', 'tournament_rounds_id_seq'],
    ARRAY['tournament_standings', 'id', 'tournament_standings_id_seq'],
    ARRAY['tournament_template_phases', 'id', 'tournament_template_phases_id_seq'],
    ARRAY['tournament_templates', 'id', 'tournament_templates_id_seq'],
    ARRAY['tournaments', 'id', 'tournaments_id_seq'],
    ARRAY['user_group_roles', 'id', 'user_group_roles_id_seq']
  ];
  i int;
  tbl_name text;
  col_name text;
  seq_name text;
BEGIN
  FOR i IN 1..array_length(tables_cols_seqs, 1) LOOP
    tbl_name := tables_cols_seqs[i][1];
    col_name := tables_cols_seqs[i][2];
    seq_name := tables_cols_seqs[i][3];
    
    -- Only set default if table and column exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = tbl_name 
        AND column_name = col_name
    ) THEN
      -- Set default using fully dynamic SQL to avoid parse-time resolution
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT nextval(''public.%I'')', tbl_name, col_name, seq_name);
    END IF;
  END LOOP;
END $$;

-- Step 4: Handle special cases for UUID columns
-- These tables have bigint IDs in baseline but UUID in production.
-- On fresh databases (empty tables), we drop and recreate the column as UUID.
-- On databases that already have UUID, we just ensure the default is set.
DO $$ 
DECLARE
  has_data boolean;
BEGIN
  -- feature_usage - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id') THEN
    -- Check if already UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id' AND data_type = 'uuid') THEN
      -- Already UUID, just ensure default is set
      ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
    ELSE
      -- Is bigint, need to convert. Check if table has data.
      EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.feature_usage LIMIT 1)' INTO has_data;
      IF NOT has_data THEN
        -- No data, safe to drop and recreate
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_usage' AND column_name = 'id' AND is_identity = 'YES') THEN
          ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" DROP IDENTITY;
        END IF;
        ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" DROP DEFAULT;
        ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" SET DATA TYPE uuid USING extensions.uuid_generate_v4();
        ALTER TABLE "public"."feature_usage" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
      END IF;
      -- If has_data and is bigint, skip conversion (can't convert existing bigint to uuid)
    END IF;
  END IF;
END $$;

DO $$ 
DECLARE
  has_data boolean;
BEGIN
  -- rate_limits - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id') THEN
    -- Check if already UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id' AND data_type = 'uuid') THEN
      -- Already UUID, just ensure default is set
      ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
    ELSE
      -- Is bigint, need to convert. Check if table has data.
      EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.rate_limits LIMIT 1)' INTO has_data;
      IF NOT has_data THEN
        -- No data, safe to drop and recreate
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rate_limits' AND column_name = 'id' AND is_identity = 'YES') THEN
          ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" DROP IDENTITY;
        END IF;
        ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" DROP DEFAULT;
        ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" SET DATA TYPE uuid USING extensions.uuid_generate_v4();
        ALTER TABLE "public"."rate_limits" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
      END IF;
      -- If has_data and is bigint, skip conversion (can't convert existing bigint to uuid)
    END IF;
  END IF;
END $$;

DO $$ 
DECLARE
  has_data boolean;
BEGIN
  -- subscriptions - convert to UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id') THEN
    -- Check if already UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id' AND data_type = 'uuid') THEN
      -- Already UUID, just ensure default is set
      ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
    ELSE
      -- Is bigint, need to convert. Check if table has data.
      EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.subscriptions LIMIT 1)' INTO has_data;
      IF NOT has_data THEN
        -- No data, safe to drop and recreate
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id' AND is_identity = 'YES') THEN
          ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" DROP IDENTITY;
        END IF;
        ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" DROP DEFAULT;
        ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" SET DATA TYPE uuid USING extensions.uuid_generate_v4();
        ALTER TABLE "public"."subscriptions" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
      END IF;
      -- If has_data and is bigint, skip conversion (can't convert existing bigint to uuid)
    END IF;
  END IF;
END $$;

-- Handle tournament_player_stats opponent_history column
-- This column is bigint[] in baseline but uuid[] in production
DO $$ 
DECLARE
  current_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'opponent_history') THEN
    -- Get the actual element type
    SELECT udt_name INTO current_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournament_player_stats' AND column_name = 'opponent_history';
    
    IF current_type = '_uuid' THEN
      -- Already uuid[], just ensure default
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" SET DEFAULT '{}'::uuid[];
    ELSIF current_type = '_int8' THEN
      -- Is bigint[], convert to uuid[] (empty array conversion is safe)
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" DROP DEFAULT;
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" SET DATA TYPE uuid[] USING '{}'::uuid[];
      ALTER TABLE "public"."tournament_player_stats" ALTER COLUMN "opponent_history" SET DEFAULT '{}'::uuid[];
    END IF;
  END IF;
END $$;

-- Handle tournaments participants column  
-- This column is bigint[] in baseline but uuid[] in production
DO $$ 
DECLARE
  current_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'participants') THEN
    -- Get the actual element type
    SELECT udt_name INTO current_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'participants';
    
    IF current_type = '_uuid' THEN
      -- Already uuid[], just ensure default
      ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" SET DEFAULT '{}'::uuid[];
    ELSIF current_type = '_int8' THEN
      -- Is bigint[], convert to uuid[] (empty array conversion is safe)
      ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" DROP DEFAULT;
      ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" SET DATA TYPE uuid[] USING '{}'::uuid[];
      ALTER TABLE "public"."tournaments" ALTER COLUMN "participants" SET DEFAULT '{}'::uuid[];
    END IF;
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
  SELECT COUNT(*)::integer
  INTO v_current_count
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = p_tournament_id
    AND tr.status = 'registered';

  -- Determine registration status based on capacity
  IF v_tournament.max_participants IS NOT NULL
     AND v_current_count >= v_tournament.max_participants THEN
    v_registration_status := 'waitlist';
  ELSE
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

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_registration_id,
    'status', v_registration_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'register_for_tournament_atomic failed for tournament % alt %: %',
      p_tournament_id, p_alt_id, SQLERRM;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration failed. Please try again or contact support if the issue persists.'
    );
END;
$function$;
