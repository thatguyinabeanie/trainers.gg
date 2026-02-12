drop extension if exists "pg_net";

create sequence "public"."alts_id_seq";

create sequence "public"."group_roles_id_seq";

create sequence "public"."groups_id_seq";

create sequence "public"."organization_invitations_id_seq";

create sequence "public"."organization_requests_id_seq";

create sequence "public"."organization_staff_id_seq";

create sequence "public"."organizations_id_seq";

create sequence "public"."permissions_id_seq";

create sequence "public"."pokemon_id_seq";

create sequence "public"."role_permissions_id_seq";

create sequence "public"."roles_id_seq";

create sequence "public"."team_pokemon_id_seq";

create sequence "public"."teams_id_seq";

create sequence "public"."tournament_events_id_seq";

create sequence "public"."tournament_invitations_id_seq";

create sequence "public"."tournament_matches_id_seq";

create sequence "public"."tournament_opponent_history_id_seq";

create sequence "public"."tournament_pairings_id_seq";

create sequence "public"."tournament_phases_id_seq";

create sequence "public"."tournament_player_stats_id_seq";

create sequence "public"."tournament_registration_pokemon_id_seq";

create sequence "public"."tournament_registrations_id_seq";

create sequence "public"."tournament_rounds_id_seq";

create sequence "public"."tournament_standings_id_seq";

create sequence "public"."tournament_template_phases_id_seq";

create sequence "public"."tournament_templates_id_seq";

create sequence "public"."tournaments_id_seq";

create sequence "public"."user_group_roles_id_seq";

alter table "public"."organization_requests" drop constraint "organization_requests_created_organization_id_fkey";

alter table "public"."tournament_templates" drop constraint "tournament_templates_organization_id_fkey";

alter table "public"."alts" alter column "id" set default nextval('public.alts_id_seq'::regclass);

alter table "public"."alts" alter column "id" drop identity;

alter table "public"."feature_usage" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."feature_usage" alter column "id" drop identity;

alter table "public"."feature_usage" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."group_roles" alter column "id" set default nextval('public.group_roles_id_seq'::regclass);

alter table "public"."group_roles" alter column "id" drop identity;

alter table "public"."groups" alter column "id" set default nextval('public.groups_id_seq'::regclass);

alter table "public"."groups" alter column "id" drop identity;

alter table "public"."organization_invitations" alter column "id" set default nextval('public.organization_invitations_id_seq'::regclass);

alter table "public"."organization_invitations" alter column "id" drop identity;

alter table "public"."organization_requests" alter column "id" set default nextval('public.organization_requests_id_seq'::regclass);

alter table "public"."organization_requests" alter column "id" drop identity;

alter table "public"."organization_staff" alter column "id" set default nextval('public.organization_staff_id_seq'::regclass);

alter table "public"."organization_staff" alter column "id" drop identity;

alter table "public"."organizations" alter column "id" set default nextval('public.organizations_id_seq'::regclass);

alter table "public"."organizations" alter column "id" drop identity;

alter table "public"."permissions" alter column "id" set default nextval('public.permissions_id_seq'::regclass);

alter table "public"."permissions" alter column "id" drop identity;

alter table "public"."pokemon" alter column "id" set default nextval('public.pokemon_id_seq'::regclass);

alter table "public"."pokemon" alter column "id" drop identity;

alter table "public"."rate_limits" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."rate_limits" alter column "id" drop identity;

alter table "public"."rate_limits" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."role_permissions" alter column "id" set default nextval('public.role_permissions_id_seq'::regclass);

alter table "public"."role_permissions" alter column "id" drop identity;

alter table "public"."roles" alter column "id" set default nextval('public.roles_id_seq'::regclass);

alter table "public"."roles" alter column "id" drop identity;

alter table "public"."subscriptions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."subscriptions" alter column "id" drop identity;

alter table "public"."subscriptions" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."team_pokemon" alter column "id" set default nextval('public.team_pokemon_id_seq'::regclass);

alter table "public"."team_pokemon" alter column "id" drop identity;

alter table "public"."teams" alter column "id" set default nextval('public.teams_id_seq'::regclass);

alter table "public"."teams" alter column "id" drop identity;

alter table "public"."tournament_events" alter column "id" set default nextval('public.tournament_events_id_seq'::regclass);

alter table "public"."tournament_events" alter column "id" drop identity;

alter table "public"."tournament_invitations" alter column "id" set default nextval('public.tournament_invitations_id_seq'::regclass);

alter table "public"."tournament_invitations" alter column "id" drop identity;

alter table "public"."tournament_matches" alter column "id" set default nextval('public.tournament_matches_id_seq'::regclass);

alter table "public"."tournament_matches" alter column "id" drop identity;

alter table "public"."tournament_opponent_history" alter column "id" set default nextval('public.tournament_opponent_history_id_seq'::regclass);

alter table "public"."tournament_opponent_history" alter column "id" drop identity;

alter table "public"."tournament_pairings" alter column "id" set default nextval('public.tournament_pairings_id_seq'::regclass);

alter table "public"."tournament_pairings" alter column "id" drop identity;

alter table "public"."tournament_phases" alter column "id" set default nextval('public.tournament_phases_id_seq'::regclass);

alter table "public"."tournament_phases" alter column "id" drop identity;

alter table "public"."tournament_player_stats" alter column "id" set default nextval('public.tournament_player_stats_id_seq'::regclass);

alter table "public"."tournament_player_stats" alter column "id" drop identity;

alter table "public"."tournament_player_stats" alter column "opponent_history" set default '{}'::uuid[];

alter table "public"."tournament_player_stats" alter column "opponent_history" set data type uuid[] using "opponent_history"::uuid[];

alter table "public"."tournament_registration_pokemon" alter column "id" set default nextval('public.tournament_registration_pokemon_id_seq'::regclass);

alter table "public"."tournament_registration_pokemon" alter column "id" drop identity;

alter table "public"."tournament_registrations" alter column "id" set default nextval('public.tournament_registrations_id_seq'::regclass);

alter table "public"."tournament_registrations" alter column "id" drop identity;

alter table "public"."tournament_rounds" alter column "id" set default nextval('public.tournament_rounds_id_seq'::regclass);

alter table "public"."tournament_rounds" alter column "id" drop identity;

alter table "public"."tournament_standings" alter column "id" set default nextval('public.tournament_standings_id_seq'::regclass);

alter table "public"."tournament_standings" alter column "id" drop identity;

alter table "public"."tournament_template_phases" alter column "id" set default nextval('public.tournament_template_phases_id_seq'::regclass);

alter table "public"."tournament_template_phases" alter column "id" drop identity;

alter table "public"."tournament_templates" alter column "id" set default nextval('public.tournament_templates_id_seq'::regclass);

alter table "public"."tournament_templates" alter column "id" drop identity;

alter table "public"."tournaments" alter column "id" set default nextval('public.tournaments_id_seq'::regclass);

alter table "public"."tournaments" alter column "id" drop identity;

alter table "public"."tournaments" alter column "participants" set default '{}'::uuid[];

alter table "public"."tournaments" alter column "participants" set data type uuid[] using "participants"::uuid[];

alter table "public"."user_group_roles" alter column "id" set default nextval('public.user_group_roles_id_seq'::regclass);

alter table "public"."user_group_roles" alter column "id" drop identity;

alter table "public"."organization_requests" add constraint "organization_requests_created_organization_id_fkey" FOREIGN KEY (created_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."organization_requests" validate constraint "organization_requests_created_organization_id_fkey";

alter table "public"."tournament_templates" add constraint "tournament_templates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_templates" validate constraint "tournament_templates_organization_id_fkey";

set check_function_bodies = off;

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
  $function$
;

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
$function$
;


