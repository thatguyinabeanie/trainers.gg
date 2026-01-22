-- =============================================================================
-- Tournament Core Tables (IDEMPOTENT)
-- =============================================================================
-- Core tournament structure: tournaments, templates, phases.
-- Uses CREATE TABLE IF NOT EXISTS and DO blocks for constraints.

-- Tournament templates (reusable configurations)
CREATE TABLE IF NOT EXISTS "public"."tournament_templates" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "organization_id" bigint,
    "is_public" boolean DEFAULT false,
    "template_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" bigint NOT NULL,
    "use_count" integer DEFAULT 0,
    "is_official" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_templates" OWNER TO "postgres";

-- Tournament template phases
CREATE TABLE IF NOT EXISTS "public"."tournament_template_phases" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "template_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "phase_type" "text" NOT NULL,
    "phase_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_template_phases" OWNER TO "postgres";

-- Tournaments
CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "organization_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "format" "text",
    "status" "public"."tournament_status" DEFAULT 'draft'::"public"."tournament_status",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "registration_deadline" timestamp with time zone,
    "max_participants" integer,
    "top_cut_size" integer,
    "swiss_rounds" integer,
    "tournament_format" "public"."tournament_format",
    "round_time_minutes" integer DEFAULT 50,
    "check_in_window_minutes" integer DEFAULT 60,
    "featured" boolean DEFAULT false,
    "prize_pool" "text",
    "rental_team_photos_enabled" boolean DEFAULT false,
    "rental_team_photos_required" boolean DEFAULT false,
    "template_id" bigint,
    "current_phase_id" bigint,
    "current_round" integer DEFAULT 0,
    "participants" bigint[] DEFAULT '{}'::bigint[],
    "tournament_state" "jsonb" DEFAULT '{}'::"jsonb",
    "archived_at" timestamp with time zone,
    "archived_by" bigint,
    "archive_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournaments" OWNER TO "postgres";

-- Tournament phases (actual instances within a tournament)
CREATE TABLE IF NOT EXISTS "public"."tournament_phases" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tournament_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "phase_type" "text" NOT NULL,
    "status" "public"."phase_status" DEFAULT 'pending'::"public"."phase_status",
    "match_format" "text" NOT NULL,
    "round_time_minutes" integer,
    "planned_rounds" integer,
    "current_round" integer DEFAULT 0,
    "advancement_type" "text",
    "advancement_count" integer,
    "bracket_size" integer,
    "total_rounds" integer,
    "bracket_format" "text",
    "seeding_method" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tournament_phases" OWNER TO "postgres";

-- Primary keys (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_templates_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_templates" ADD CONSTRAINT "tournament_templates_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_template_phases_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_template_phases" ADD CONSTRAINT "tournament_template_phases_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_pkey') THEN
        ALTER TABLE ONLY "public"."tournaments" ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_phases_pkey') THEN
        ALTER TABLE ONLY "public"."tournament_phases" ADD CONSTRAINT "tournament_phases_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Unique constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_organization_id_slug_key') THEN
        ALTER TABLE ONLY "public"."tournaments" ADD CONSTRAINT "tournaments_organization_id_slug_key" UNIQUE ("organization_id", "slug");
    END IF;
END $$;

-- Foreign keys (idempotent)
DO $$
BEGIN
    -- tournament_templates -> organizations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_templates_organization_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_templates"
            ADD CONSTRAINT "tournament_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;
    END IF;
    
    -- tournament_templates -> profiles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_templates_created_by_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_templates"
            ADD CONSTRAINT "tournament_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    
    -- tournament_template_phases -> tournament_templates
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_template_phases_template_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_template_phases"
            ADD CONSTRAINT "tournament_template_phases_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE CASCADE;
    END IF;
    
    -- tournaments -> organizations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_organization_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournaments"
            ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
    END IF;
    
    -- tournaments -> tournament_templates
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_template_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournaments"
            ADD CONSTRAINT "tournaments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."tournament_templates"("id") ON DELETE SET NULL;
    END IF;
    
    -- tournaments -> profiles (archived_by)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_archived_by_fkey') THEN
        ALTER TABLE ONLY "public"."tournaments"
            ADD CONSTRAINT "tournaments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");
    END IF;
    
    -- tournament_phases -> tournaments
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_phases_tournament_id_fkey') THEN
        ALTER TABLE ONLY "public"."tournament_phases"
            ADD CONSTRAINT "tournament_phases_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;
    END IF;
    
    -- Deferred FK for tournaments.current_phase_id (self-referencing through phases)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_current_phase_fk') THEN
        ALTER TABLE ONLY "public"."tournaments"
            ADD CONSTRAINT "tournaments_current_phase_fk" FOREIGN KEY ("current_phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE SET NULL;
    END IF;
END $$;
