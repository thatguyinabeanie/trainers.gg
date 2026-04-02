-- =============================================================================
-- 13_team_sheets.sql - Set game_format + create OTS snapshots for started tournaments
-- =============================================================================
-- Depends on: 09_teams.sql, 10_tournaments.sql
-- Sets game_format on all tournaments and creates tournament_team_sheets
-- snapshot rows for active/completed tournaments (simulating what happens
-- when startTournamentEnhanced is called).
-- =============================================================================

DO $$
DECLARE
  sheets_exist boolean;
  t record;
  reg record;
  tp record;
BEGIN
  -- Always backfill game_format (idempotent — only updates NULLs)
  UPDATE public.tournaments SET game_format = 'gen9vgc2026regi' WHERE game_format IS NULL;

  -- Skip snapshot creation if already seeded
  SELECT EXISTS(SELECT 1 FROM public.tournament_team_sheets LIMIT 1) INTO sheets_exist;
  IF sheets_exist THEN
    RAISE NOTICE 'Team sheets already seeded, skipping';
    RETURN;
  END IF;

  -- Create OTS snapshots for all active/completed tournaments
  -- This simulates what createTournamentTeamSheets does at tournament start:
  -- reads private team data, writes only OTS fields (species, ability, item, tera, moves)
  FOR t IN
    SELECT id, game_format FROM public.tournaments
    WHERE status IN ('active', 'completed')
  LOOP
    FOR reg IN
      SELECT tr.id AS reg_id, tr.alt_id, tr.team_id
      FROM public.tournament_registrations tr
      WHERE tr.tournament_id = t.id
        AND tr.team_id IS NOT NULL
        AND tr.status = 'checked_in'
    LOOP
      FOR tp IN
        SELECT
          tpk.team_position,
          p.species,
          p.ability,
          p.held_item,
          p.tera_type,
          p.move1,
          p.move2,
          p.move3,
          p.move4
        FROM public.team_pokemon tpk
        JOIN public.pokemon p ON p.id = tpk.pokemon_id
        WHERE tpk.team_id = reg.team_id
        ORDER BY tpk.team_position
      LOOP
        INSERT INTO public.tournament_team_sheets (
          tournament_id, registration_id, alt_id, team_id,
          format, position, species, ability, held_item, tera_type,
          move1, move2, move3, move4
        ) VALUES (
          t.id, reg.reg_id, reg.alt_id, reg.team_id,
          COALESCE(t.game_format, 'gen9vgc2026regi'),
          tp.team_position, tp.species, tp.ability, tp.held_item, tp.tera_type,
          tp.move1, tp.move2, tp.move3, tp.move4
        ) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Team sheet snapshots created for active/completed tournaments';
END $$;
