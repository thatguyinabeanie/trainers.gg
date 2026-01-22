-- =============================================================================
-- Tournament Operations Tables (IDEMPOTENT)
-- =============================================================================
-- Tournament runtime: rounds, matches, pairings, registrations, stats, standings.
-- Uses CREATE TABLE IF NOT EXISTS and DO blocks for constraints.

-- Tournament rounds
CREATE TABLE IF NOT EXISTS "public"."tournament_rounds" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "phase_id" bigint NOT NULL,
    "round_number" integer NOT NULL,
    "name" "text",
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "time_extension_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_rounds" OWNER TO "postgres";

-- Tournament matches
CREATE TABLE IF NOT EXISTS "public"."tournament_matches" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "round_id" bigint NOT NULL,
    "profile1_id" bigint,
    "profile2_id" bigint,
    "winner_profile_id" bigint,
    "match_points1" integer DEFAULT 0,
    "match_points2" integer DEFAULT 0,
    "game_wins1" integer DEFAULT 0,
    "game_wins2" integer DEFAULT 0,
    "is_bye" boolean DEFAULT false,
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "table_number" integer,
    "player1_match_confirmed" boolean DEFAULT false,
    "player2_match_confirmed" boolean DEFAULT false,
    "match_confirmed_at" timestamp with time zone,
    "staff_requested" boolean DEFAULT false,
    "staff_requested_at" timestamp with time zone,
    "staff_resolved_by" bigint,
    "staff_notes" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_matches" OWNER TO "postgres";

-- Tournament pairings
CREATE TABLE IF NOT EXISTS "public"."tournament_pairings" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "round_id" bigint NOT NULL,
    "match_id" bigint,
    "profile1_id" bigint,
    "profile2_id" bigint,
    "pairing_type" "text" NOT NULL,
    "is_bye" boolean DEFAULT false,
    "table_number" integer,
    "profile1_seed" integer,
    "profile2_seed" integer,
    "pairing_reason" "text",
    "algorithm_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_pairings" OWNER TO "postgres";

-- Tournament registrations
CREATE TABLE IF NOT EXISTS "public"."tournament_registrations" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "profile_id" bigint NOT NULL,
    "status" "public"."registration_status" DEFAULT 'pending'::"public"."registration_status",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "checked_in_at" timestamp with time zone,
    "team_name" "text",
    "notes" "text",
    "team_id" bigint,
    "rental_team_photo_url" "text",
    "rental_team_photo_key" "text",
    "rental_team_photo_uploaded_at" timestamp with time zone,
    "rental_team_photo_verified" boolean DEFAULT false,
    "rental_team_photo_verified_by" bigint,
    "rental_team_photo_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_registrations" OWNER TO "postgres";

-- Tournament registration pokemon
CREATE TABLE IF NOT EXISTS "public"."tournament_registration_pokemon" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_registration_id" bigint NOT NULL,
    "pokemon_id" bigint NOT NULL,
    "team_position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_registration_pokemon" OWNER TO "postgres";

-- Tournament invitations
CREATE TABLE IF NOT EXISTS "public"."tournament_invitations" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "invited_profile_id" bigint NOT NULL,
    "invited_by_profile_id" bigint NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status",
    "message" "text",
    "expires_at" timestamp with time zone,
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    "registration_id" bigint
);
ALTER TABLE "public"."tournament_invitations" OWNER TO "postgres";

-- Tournament events (audit log)
CREATE TABLE IF NOT EXISTS "public"."tournament_events" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" bigint,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_events" OWNER TO "postgres";

-- Tournament player stats
CREATE TABLE IF NOT EXISTS "public"."tournament_player_stats" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "profile_id" bigint NOT NULL,
    "match_points" integer DEFAULT 0,
    "matches_played" integer DEFAULT 0,
    "match_wins" integer DEFAULT 0,
    "match_losses" integer DEFAULT 0,
    "match_win_percentage" numeric(5,4) DEFAULT 0,
    "game_wins" integer DEFAULT 0,
    "game_losses" integer DEFAULT 0,
    "game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "strength_of_schedule" numeric(10,6) DEFAULT 0,
    "buchholz_score" numeric(10,6) DEFAULT 0,
    "modified_buchholz_score" numeric(10,6) DEFAULT 0,
    "last_tiebreaker_update" timestamp with time zone,
    "current_standing" integer,
    "standings_need_recalc" boolean DEFAULT true,
    "has_received_bye" boolean DEFAULT false,
    "is_dropped" boolean DEFAULT false,
    "current_seed" integer,
    "final_ranking" integer,
    "opponent_history" bigint[] DEFAULT '{}'::bigint[],
    "rounds_played" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_player_stats" OWNER TO "postgres";

-- Tournament standings (per-round snapshots)
CREATE TABLE IF NOT EXISTS "public"."tournament_standings" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "profile_id" bigint NOT NULL,
    "round_number" integer NOT NULL,
    "match_points" integer DEFAULT 0,
    "game_wins" integer DEFAULT 0,
    "game_losses" integer DEFAULT 0,
    "match_win_percentage" numeric(5,4) DEFAULT 0,
    "game_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_match_win_percentage" numeric(5,4) DEFAULT 0,
    "opponent_game_win_percentage" numeric(5,4) DEFAULT 0,
    "rank" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_standings" OWNER TO "postgres";

-- Tournament opponent history
CREATE TABLE IF NOT EXISTS "public"."tournament_opponent_history" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "profile_id" bigint NOT NULL,
    "opponent_id" bigint NOT NULL,
    "round_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_opponent_history" OWNER TO "postgres";

-- =============================================================================
-- Primary Keys (idempotent)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_rounds_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_rounds" ADD CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings" ADD CONSTRAINT "tournament_pairings_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokemon_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_registration_pokemon" ADD CONSTRAINT "tournament_registration_pokemon_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_invitations" ADD CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_events_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_events" ADD CONSTRAINT "tournament_events_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_player_stats_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_standings_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_standings" ADD CONSTRAINT "tournament_standings_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_opponent_history_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_opponent_history" ADD CONSTRAINT "tournament_opponent_history_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- =============================================================================
-- Check Constraints (idempotent)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokemon_team_position_check') THEN
        ALTER TABLE "public"."tournament_registration_pokemon" 
            ADD CONSTRAINT "tournament_registration_pokemon_team_position_check" CHECK ((("team_position" >= 1) AND ("team_position" <= 6)));
    END IF;
END $$;

-- =============================================================================
-- Unique Constraints (idempotent)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_rounds_phase_id_round_number_key') THEN
        ALTER TABLE ONLY "public"."tournament_rounds" ADD CONSTRAINT "tournament_rounds_phase_id_round_number_key" UNIQUE ("phase_id", "round_number");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_tournament_id_profile_id_key') THEN
        ALTER TABLE ONLY "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_profile_id_key" UNIQUE ("tournament_id", "profile_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokem_tournament_registration_id_po_key') THEN
        ALTER TABLE ONLY "public"."tournament_registration_pokemon" ADD CONSTRAINT "tournament_registration_pokem_tournament_registration_id_po_key" UNIQUE ("tournament_registration_id", "pokemon_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokem_tournament_registration_id_te_key') THEN
        ALTER TABLE ONLY "public"."tournament_registration_pokemon" ADD CONSTRAINT "tournament_registration_pokem_tournament_registration_id_te_key" UNIQUE ("tournament_registration_id", "team_position");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_tournament_id_invited_profile_id_key') THEN
        ALTER TABLE ONLY "public"."tournament_invitations" ADD CONSTRAINT "tournament_invitations_tournament_id_invited_profile_id_key" UNIQUE ("tournament_id", "invited_profile_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_player_stats_tournament_id_profile_id_key') THEN
        ALTER TABLE ONLY "public"."tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_tournament_id_profile_id_key" UNIQUE ("tournament_id", "profile_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_standings_tournament_id_profile_id_round_number_key') THEN
        ALTER TABLE ONLY "public"."tournament_standings" ADD CONSTRAINT "tournament_standings_tournament_id_profile_id_round_number_key" UNIQUE ("tournament_id", "profile_id", "round_number");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_opponent_history_tournament_id_profile_id_oppone_key') THEN
        ALTER TABLE ONLY "public"."tournament_opponent_history" ADD CONSTRAINT "tournament_opponent_history_tournament_id_profile_id_oppone_key" UNIQUE ("tournament_id", "profile_id", "opponent_id", "round_number");
    END IF;
END $$;

-- =============================================================================
-- Foreign Keys (idempotent)
-- =============================================================================

DO $$
BEGIN
    -- Rounds
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_rounds_phase_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_rounds"
            ADD CONSTRAINT "tournament_rounds_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE CASCADE;
    END IF;
    
    -- Matches
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_round_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches"
            ADD CONSTRAINT "tournament_matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_profile1_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches"
            ADD CONSTRAINT "tournament_matches_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_profile2_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches"
            ADD CONSTRAINT "tournament_matches_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_winner_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches"
            ADD CONSTRAINT "tournament_matches_winner_profile_id_fkey" FOREIGN KEY ("winner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_staff_resolved_by_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_matches"
            ADD CONSTRAINT "tournament_matches_staff_resolved_by_fkey" FOREIGN KEY ("staff_resolved_by") REFERENCES "public"."profiles"("id");
    END IF;
    
    -- Pairings
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings"
            ADD CONSTRAINT "tournament_pairings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_round_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings"
            ADD CONSTRAINT "tournament_pairings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_match_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings"
            ADD CONSTRAINT "tournament_pairings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_profile1_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings"
            ADD CONSTRAINT "tournament_pairings_profile1_id_fkey" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_pairings_profile2_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_pairings"
            ADD CONSTRAINT "tournament_pairings_profile2_id_fkey" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    END IF;
    
    -- Registrations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_registrations"
            ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_registrations"
            ADD CONSTRAINT "tournament_registrations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_team_fk') THEN
        ALTER TABLE ONLY "public"."tournament_registrations"
            ADD CONSTRAINT "tournament_registrations_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_rental_team_photo_verified_by_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_registrations"
            ADD CONSTRAINT "tournament_registrations_rental_team_photo_verified_by_fkey" FOREIGN KEY ("rental_team_photo_verified_by") REFERENCES "public"."profiles"("id");
    END IF;
    
    -- Registration Pokemon
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokemon_tournament_registration_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_registration_pokemon"
            ADD CONSTRAINT "tournament_registration_pokemon_tournament_registration_id_fkey" FOREIGN KEY ("tournament_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registration_pokemon_pokemon_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_registration_pokemon"
            ADD CONSTRAINT "tournament_registration_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;
    END IF;
    
    -- Invitations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_invitations"
            ADD CONSTRAINT "tournament_invitations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_invited_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_invitations"
            ADD CONSTRAINT "tournament_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_invited_by_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_invitations"
            ADD CONSTRAINT "tournament_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_invitations_registration_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_invitations"
            ADD CONSTRAINT "tournament_invitations_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE SET NULL;
    END IF;
    
    -- Events
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_events_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_events"
            ADD CONSTRAINT "tournament_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_events_created_by_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_events"
            ADD CONSTRAINT "tournament_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
    END IF;
    
    -- Player Stats
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_player_stats_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_player_stats"
            ADD CONSTRAINT "tournament_player_stats_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_player_stats_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_player_stats"
            ADD CONSTRAINT "tournament_player_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    -- Standings
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_standings_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_standings"
            ADD CONSTRAINT "tournament_standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_standings_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_standings"
            ADD CONSTRAINT "tournament_standings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    -- Opponent History
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_opponent_history_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_opponent_history"
            ADD CONSTRAINT "tournament_opponent_history_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_opponent_history_profile_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_opponent_history"
            ADD CONSTRAINT "tournament_opponent_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_opponent_history_opponent_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_opponent_history"
            ADD CONSTRAINT "tournament_opponent_history_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
END $$;
