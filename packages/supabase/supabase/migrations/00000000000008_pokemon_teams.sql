-- =============================================================================
-- Pokemon and Teams Tables
-- =============================================================================
-- Pokemon data and team composition for competitive play.

-- Pokemon table
CREATE TABLE IF NOT EXISTS "public"."pokemon" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "species" "text" NOT NULL,
    "nickname" "text",
    "level" integer DEFAULT 50,
    "nature" "text" NOT NULL,
    "ability" "text" NOT NULL,
    "held_item" "text",
    "gender" "public"."pokemon_gender",
    "is_shiny" boolean DEFAULT false,
    "move1" "text" NOT NULL,
    "move2" "text",
    "move3" "text",
    "move4" "text",
    "ev_hp" integer DEFAULT 0,
    "ev_attack" integer DEFAULT 0,
    "ev_defense" integer DEFAULT 0,
    "ev_special_attack" integer DEFAULT 0,
    "ev_special_defense" integer DEFAULT 0,
    "ev_speed" integer DEFAULT 0,
    "iv_hp" integer DEFAULT 31,
    "iv_attack" integer DEFAULT 31,
    "iv_defense" integer DEFAULT 31,
    "iv_special_attack" integer DEFAULT 31,
    "iv_special_defense" integer DEFAULT 31,
    "iv_speed" integer DEFAULT 31,
    "tera_type" "text",
    "format_legal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    -- EV constraints
    CONSTRAINT "ev_total_check" CHECK ((((((("ev_hp" + "ev_attack") + "ev_defense") + "ev_special_attack") + "ev_special_defense") + "ev_speed") <= 510)),
    CONSTRAINT "pokemon_ev_hp_check" CHECK ((("ev_hp" >= 0) AND ("ev_hp" <= 252))),
    CONSTRAINT "pokemon_ev_attack_check" CHECK ((("ev_attack" >= 0) AND ("ev_attack" <= 252))),
    CONSTRAINT "pokemon_ev_defense_check" CHECK ((("ev_defense" >= 0) AND ("ev_defense" <= 252))),
    CONSTRAINT "pokemon_ev_special_attack_check" CHECK ((("ev_special_attack" >= 0) AND ("ev_special_attack" <= 252))),
    CONSTRAINT "pokemon_ev_special_defense_check" CHECK ((("ev_special_defense" >= 0) AND ("ev_special_defense" <= 252))),
    CONSTRAINT "pokemon_ev_speed_check" CHECK ((("ev_speed" >= 0) AND ("ev_speed" <= 252))),
    -- IV constraints
    CONSTRAINT "pokemon_iv_hp_check" CHECK ((("iv_hp" >= 0) AND ("iv_hp" <= 31))),
    CONSTRAINT "pokemon_iv_attack_check" CHECK ((("iv_attack" >= 0) AND ("iv_attack" <= 31))),
    CONSTRAINT "pokemon_iv_defense_check" CHECK ((("iv_defense" >= 0) AND ("iv_defense" <= 31))),
    CONSTRAINT "pokemon_iv_special_attack_check" CHECK ((("iv_special_attack" >= 0) AND ("iv_special_attack" <= 31))),
    CONSTRAINT "pokemon_iv_special_defense_check" CHECK ((("iv_special_defense" >= 0) AND ("iv_special_defense" <= 31))),
    CONSTRAINT "pokemon_iv_speed_check" CHECK ((("iv_speed" >= 0) AND ("iv_speed" <= 31)))
);
ALTER TABLE "public"."pokemon" OWNER TO "postgres";

-- Teams table
CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" bigint NOT NULL,
    "is_public" boolean DEFAULT false,
    "format_legal" boolean DEFAULT true,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."teams" OWNER TO "postgres";

-- Team pokemon junction table
CREATE TABLE IF NOT EXISTS "public"."team_pokemon" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "team_id" bigint NOT NULL,
    "pokemon_id" bigint NOT NULL,
    "team_position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_pokemon_team_position_check" CHECK ((("team_position" >= 1) AND ("team_position" <= 6)))
);
ALTER TABLE "public"."team_pokemon" OWNER TO "postgres";

-- Primary keys
ALTER TABLE ONLY "public"."pokemon"
    ADD CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_pokemon_id_key" UNIQUE ("team_id", "pokemon_id");

ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_team_position_key" UNIQUE ("team_id", "team_position");

-- Foreign keys
ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_pokemon"
    ADD CONSTRAINT "team_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;
