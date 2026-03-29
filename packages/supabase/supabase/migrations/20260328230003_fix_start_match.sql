-- Fix stale organization_id reference in start_match.
CREATE OR REPLACE FUNCTION public.start_match(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_match record;
  v_is_participant boolean;
  v_org_id bigint;
  v_is_staff boolean;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.user_id = v_user_id
    AND (v_match.alt1_id = a.id OR v_match.alt2_id = a.id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

    IF NOT v_is_staff THEN
      RAISE EXCEPTION 'Only match participants or org staff can start a match';
    END IF;
  END IF;

  IF v_match.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot start match with status "%"', v_match.status;
  END IF;

  UPDATE public.tournament_matches
  SET status = 'active',
      start_time = now()
  WHERE id = p_match_id;
END;
$function$;
