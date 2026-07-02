-- Convert free-form `nature` text columns into a shared Postgres enum.
--
-- WHY: Five tables independently store nature as free-form text. This unifies
-- them under one Title-Case enum (public.pokemon_nature) matching the 25
-- canonical natures already used in code (packages/pokemon ALL_NATURES /
-- isNature()). Importers coerce unknown/invalid values to NULL before insert
-- (see decision 4 in docs/decisions/2026-07-01-pokemon-nature-enum.md) so a
-- surprise third-party value can never fail an import — this migration
-- performs the same coercion for any pre-existing rows before the type change.
--
-- Also unifies vocabulary (decision 7): RK9's `stat_alignment` is the same
-- datum as `nature` under RK9's own HTML label ("Stat Alignment"). We rename
-- the column to `nature` here, on top of the enum re-type, so the whole
-- codebase uses one word. The scraper's `extractLabeledValue(..., "Stat
-- Alignment")` string match is untouched — it matches RK9's HTML, not our
-- schema.
--
-- See docs/decisions/2026-07-01-pokemon-nature-enum.md for the full spec.

-- =============================================================================
-- Step 1 — create the enum (idempotent)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.pokemon_nature AS ENUM (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE public.pokemon_nature IS
  'The 25 canonical Pokemon natures, Title Case (e.g. ''Jolly''). '
  'Matches @pkmn/Showdown casing and packages/pokemon ALL_NATURES / isNature(). '
  'Order is declaration order, not alphabetical — see get_usage_pipeline / '
  'get_species_usage_detail for why nature histogram reads cast to ::text.';

-- =============================================================================
-- Step 2 — convert each scalar nature column
-- =============================================================================
-- None of the five columns below have a DEFAULT (confirmed by reading each
-- source migration), so no DROP/re-add DEFAULT step is needed.
--
-- NOTE: the original spec listed a sixth column, `public.team_pokemon.nature`
-- (the builder). That column does not exist: `public.team_pokemon` is a pure
-- join table (team_id, pokemon_id, team_position), and the builder's per-mon
-- nature lives on `public.pokemon.nature` (#1 below). The spec's cited line
-- (20260409214302_team_builder_schema.sql:77) is `imported_team_sheets.nature`
-- — a table since dropped, absent from the current schema. So we convert five
-- live columns, not six.

-- #1 public.pokemon.nature — NOT NULL, no default. Can't null a NOT NULL
-- column, so invalid values coerce to 'Hardy' instead.
UPDATE public.pokemon
  SET nature = 'Hardy'
  WHERE nature NOT IN (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );

ALTER TABLE public.pokemon
  ALTER COLUMN nature TYPE public.pokemon_nature
  USING nature::public.pokemon_nature;

-- #3 public.tournament_team_sheets.nature — nullable, no default.
UPDATE public.tournament_team_sheets
  SET nature = NULL
  WHERE nature IS NOT NULL AND nature::text NOT IN (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );

ALTER TABLE public.tournament_team_sheets
  ALTER COLUMN nature TYPE public.pokemon_nature
  USING nature::public.pokemon_nature;

-- #4 limitless.team_pokemon.nature — nullable, no default. Column added in
-- 20260627030045_limitless_team_pokemon_nature.sql (never edited — re-typed
-- here instead, per migration hygiene decision 5).
UPDATE limitless.team_pokemon
  SET nature = NULL
  WHERE nature IS NOT NULL AND nature::text NOT IN (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );

ALTER TABLE limitless.team_pokemon
  ALTER COLUMN nature TYPE public.pokemon_nature
  USING nature::public.pokemon_nature;

-- #5 public.team_slots.nature — nullable, no default.
UPDATE public.team_slots
  SET nature = NULL
  WHERE nature IS NOT NULL AND nature::text NOT IN (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );

ALTER TABLE public.team_slots
  ALTER COLUMN nature TYPE public.pokemon_nature
  USING nature::public.pokemon_nature;

-- =============================================================================
-- Step 2b — rk9.team_pokemon.stat_alignment: coerce + retype, THEN rename
-- =============================================================================
-- #6 rk9.team_pokemon.stat_alignment — nullable, no default. RK9's
-- "Stat Alignment" is the same datum as nature under RK9's own HTML label
-- (decision 7). Coerce + ALTER TYPE first (column still named stat_alignment
-- at this point), then rename to `nature` so every later statement in this
-- migration (none, here) and all future code use one shared name.

-- Idempotency guard covers the WHOLE column-6 operation (coerce + retype +
-- rename), not just the rename. All three statements reference the column by
-- its pre-rename name `stat_alignment`; after the first run that name no longer
-- exists, so a literal double-run of this file must skip the entire block or it
-- would fail at the UPDATE ("column stat_alignment does not exist") long before
-- any rename guard. Supabase tracks applied migrations and runs each file once
-- per DB, so this only matters for a hand-rolled replay — but the block below
-- makes the file a true no-op on any second execution.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'rk9'
      AND table_name = 'team_pokemon'
      AND column_name = 'stat_alignment'
  ) THEN
    UPDATE rk9.team_pokemon
      SET stat_alignment = NULL
      WHERE stat_alignment IS NOT NULL AND stat_alignment::text NOT IN (
        'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
        'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
        'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
      );

    ALTER TABLE rk9.team_pokemon
      ALTER COLUMN stat_alignment TYPE public.pokemon_nature
      USING stat_alignment::public.pokemon_nature;

    ALTER TABLE rk9.team_pokemon RENAME COLUMN stat_alignment TO nature;
  END IF;
END $$;

-- =============================================================================
-- Step 3 — fix the two team_slots usage RPCs (nature histogram ::text casts)
-- =============================================================================
-- WHY the ::text cast is mandatory (not cosmetic): both RPCs build a
-- `natures jsonb` histogram ordered `ORDER BY h.value ASC` (tie-break after
-- count DESC). A `text` value sorts alphabetically (today's behavior); an
-- **enum** value sorts by declaration order (Hardy, Lonely, Brave, ...).
-- Leaving `value`/`nature` as the enum would silently reorder every nature
-- histogram on /data. Casting nature::text keeps `value` text so ordering +
-- jsonb_build_object output stay byte-identical to pre-migration behavior.
-- The functions' RETURNS TABLE signatures are unchanged (still `natures
-- jsonb`), so downstream consumers/types are unaffected.
--
-- Both functions read only from public.team_slots (never from
-- rk9.team_pokemon directly), so the only column affected by the enum
-- conversion inside these bodies is team_slots.nature itself — its name is
-- unchanged, only its type. CREATE OR REPLACE with full current bodies,
-- changing only the nature-read expressions (and their GROUP BY) to ::text.

DROP FUNCTION IF EXISTS public.get_usage_pipeline(text, text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_pipeline(
  p_format    text,
  p_source    text  DEFAULT 'all',
  p_start     date  DEFAULT NULL,
  p_end       date  DEFAULT NULL,
  p_min_players int DEFAULT 0
)
RETURNS TABLE (
  species       text,
  players       bigint,
  usage_pct     numeric,
  rank          int,
  abilities     jsonb,
  items         jsonb,
  natures       jsonb,
  moves         jsonb,
  tera_types    jsonb,
  ability_items jsonb,
  period_start  date,
  period_end    date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.held_item,
      ts.ability,
      ts.tera_type,
      ts.moves,
      ts.nature::text AS nature,
      ts.total_players,
      ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Denominator: SUM(total_players) over DISTINCT (source, event_key, division)
  denom AS (
    SELECT SUM(d.total_players) AS total
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    HAVING SUM(d.total_players) >= p_min_players
  ),
  -- Numerator: COUNT(DISTINCT player_key) per species
  species_counts AS (
    SELECT
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    CROSS JOIN denom d
    GROUP BY s.species
  ),
  -- Slice date extent (same on every row)
  date_extent AS (
    SELECT
      MIN(event_date)::date AS slice_start,
      MAX(event_date)::date AS slice_end
    FROM slots
  ),
  -- Per-species detail histograms
  -- Inner layer produces exactly ONE deduplicated row per (species, dimension_value)
  -- with its distinct-player count; outer layer aggregates with explicit ORDER BY.
  -- This prevents jsonb_agg from emitting N identical entries (one per player row)
  -- when multiple players share the same dimension value.
  species_hist_ability AS (
    SELECT species, ability AS value,
           COUNT(DISTINCT player_key) AS cnt,
           sc.player_count
    FROM slots
    INNER JOIN species_counts sc USING (species)
    WHERE ability IS NOT NULL
    GROUP BY species, ability, sc.player_count
  ),
  species_hist_item AS (
    SELECT species, held_item AS value,
           COUNT(DISTINCT player_key) AS cnt,
           sc.player_count
    FROM slots
    INNER JOIN species_counts sc USING (species)
    WHERE held_item IS NOT NULL
    GROUP BY species, held_item, sc.player_count
  ),
  species_hist_nature AS (
    SELECT species, nature AS value,
           COUNT(DISTINCT player_key) AS cnt,
           sc.player_count
    FROM slots
    INNER JOIN species_counts sc USING (species)
    WHERE nature IS NOT NULL
    GROUP BY species, nature, sc.player_count
  ),
  species_hist_tera AS (
    SELECT species, tera_type AS value,
           COUNT(DISTINCT player_key) AS cnt,
           sc.player_count
    FROM slots
    INNER JOIN species_counts sc USING (species)
    WHERE tera_type IS NOT NULL
    GROUP BY species, tera_type, sc.player_count
  ),
  species_hist_combo AS (
    SELECT species,
           ability || ' + ' || COALESCE(held_item, 'No Item') AS value,
           COUNT(DISTINCT player_key) AS cnt,
           sc.player_count
    FROM slots
    INNER JOIN species_counts sc USING (species)
    WHERE ability IS NOT NULL
    GROUP BY species, ability || ' + ' || COALESCE(held_item, 'No Item'), sc.player_count
  ),
  species_histograms AS (
    SELECT
      sc.species,
      sc.player_count AS sp_players,
      -- abilities: one row per value already, aggregate with correct ordering
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM species_hist_ability h WHERE h.species = sc.species) AS abilities,
      -- items
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM species_hist_item h WHERE h.species = sc.species) AS items,
      -- natures
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM species_hist_nature h WHERE h.species = sc.species) AS natures,
      -- tera types
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM species_hist_tera h WHERE h.species = sc.species) AS tera_types,
      -- ability+item combos
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM species_hist_combo h WHERE h.species = sc.species) AS ability_items
    FROM species_counts sc
  ),
  -- Moves histogram (unnest required — separate CTE)
  moves_agg AS (
    SELECT
      s.species,
      m.move,
      COUNT(DISTINCT s.player_key) AS cnt,
      sp.player_count
    FROM slots s
    CROSS JOIN LATERAL unnest(s.moves) AS m(move)
    INNER JOIN species_counts sp ON sp.species = s.species
    GROUP BY s.species, m.move, sp.player_count
  ),
  moves_hist AS (
    SELECT
      species,
      jsonb_agg(
        jsonb_build_object(
          'value', move,
          'count', cnt,
          'pct', CASE WHEN player_count > 0 THEN round(100.0 * cnt / player_count, 2) ELSE 0 END
        )
        ORDER BY cnt DESC, move ASC
      ) AS moves
    FROM moves_agg
    GROUP BY species
  )
  SELECT
    sc.species,
    sc.player_count                                    AS players,
    CASE WHEN d.total > 0
      THEN round(100.0 * sc.player_count / d.total, 2)
      ELSE 0 END                                       AS usage_pct,
    dense_rank() OVER (
      ORDER BY CASE WHEN d.total > 0
        THEN round(100.0 * sc.player_count / d.total, 2)
        ELSE 0 END DESC, sc.species ASC
    )::int                                             AS rank,
    COALESCE(sh.abilities,     '[]'::jsonb)            AS abilities,
    COALESCE(sh.items,         '[]'::jsonb)            AS items,
    COALESCE(sh.natures,       '[]'::jsonb)            AS natures,
    COALESCE(mh.moves,         '[]'::jsonb)            AS moves,
    COALESCE(sh.tera_types,    '[]'::jsonb)            AS tera_types,
    COALESCE(sh.ability_items, '[]'::jsonb)            AS ability_items,
    de.slice_start                                     AS period_start,
    de.slice_end                                       AS period_end
  FROM species_counts sc
  CROSS JOIN denom d
  CROSS JOIN date_extent de
  LEFT JOIN species_histograms sh ON sh.species = sc.species
  LEFT JOIN moves_hist mh ON mh.species = sc.species
  ORDER BY usage_pct DESC, sc.species ASC
$$;

COMMENT ON FUNCTION public.get_usage_pipeline(text, text, date, date, int) IS
  'Full meta snapshot for a single time slice: usage % + detail histograms for all species. '
  'Used by the /data Meta Explorer pipeline view. '
  'nature is cast to ::text so jsonb histogram ORDER BY value stays alphabetical '
  '(not enum declaration order) — see 20260701233927_pokemon_nature_enum.sql.';

GRANT EXECUTE ON FUNCTION public.get_usage_pipeline(text, text, date, date, int)
  TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_species_usage_detail(text, text, text, text, int, int);

CREATE OR REPLACE FUNCTION public.get_species_usage_detail(
  p_format      text,
  p_species     text,
  p_source      text DEFAULT 'all',
  p_period_type text DEFAULT 'week',
  p_limit       int  DEFAULT 12,
  p_min_players int  DEFAULT 0
)
RETURNS TABLE (
  period_start      date,
  period_end        date,
  usage_pct         numeric,
  rank              int,
  sample_size       bigint,
  usage_change_7d   numeric,
  usage_change_30d  numeric,
  abilities         jsonb,
  items             jsonb,
  natures           jsonb,
  moves             jsonb,
  tera_types        jsonb,
  ability_items     jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.held_item,
      ts.ability,
      ts.tera_type,
      ts.moves,
      ts.nature::text AS nature,
      ts.total_players,
      ts.event_date,
      date_trunc(p_period_type, ts.event_date)::date AS bucket
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
  ),
  -- Denominator per bucket
  denoms AS (
    SELECT
      s.bucket,
      SUM(s.total_players) AS bucket_total
    FROM (
      SELECT DISTINCT bucket, source, event_key, division, total_players FROM slots
    ) s
    GROUP BY s.bucket
    HAVING SUM(s.total_players) >= p_min_players
  ),
  -- All-species counts per bucket (for rank computation within each bucket)
  all_species_counts AS (
    SELECT
      s.bucket,
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN denoms d ON d.bucket = s.bucket
    GROUP BY s.bucket, s.species
  ),
  -- Buckets that contain the target species, limited to trailing p_limit
  target_buckets AS (
    SELECT bucket
    FROM all_species_counts
    WHERE species = p_species
    ORDER BY bucket DESC
    LIMIT p_limit
  ),
  -- Target species counts for those buckets
  target_counts AS (
    SELECT
      asc_inner.bucket,
      asc_inner.player_count
    FROM all_species_counts asc_inner
    INNER JOIN target_buckets tb ON tb.bucket = asc_inner.bucket
    WHERE asc_inner.species = p_species
  ),
  -- Rank of target species within each bucket across all species.
  -- The window must run over ALL species per bucket BEFORE filtering to
  -- p_species — a WHERE on the same level executes before the window
  -- function, leaving a single-row partition and a constant rank of 1.
  bucket_ranks AS (
    SELECT ranked.bucket, ranked.species_rank
    FROM (
      SELECT
        asc_inner.bucket,
        asc_inner.species,
        dense_rank() OVER (
          PARTITION BY asc_inner.bucket
          ORDER BY asc_inner.player_count DESC, asc_inner.species ASC
        )::int AS species_rank
      FROM all_species_counts asc_inner
      INNER JOIN target_buckets tb ON tb.bucket = asc_inner.bucket
    ) ranked
    WHERE ranked.species = p_species
  ),
  -- Detail histograms for target species in target buckets (non-move dimensions)
  detail_slots AS (
    SELECT
      s.bucket,
      s.player_key,
      s.ability,
      s.held_item,
      s.nature,
      s.tera_type,
      s.moves,
      CASE WHEN s.ability IS NOT NULL
        THEN s.ability || ' + ' || COALESCE(s.held_item, 'No Item')
        ELSE NULL END AS combo
    FROM slots s
    INNER JOIN target_buckets tb ON tb.bucket = s.bucket
    WHERE s.species = p_species
  ),
  -- Detail histograms: inner layer produces ONE deduplicated row per (bucket, value)
  -- with its distinct-player count; outer layer aggregates with explicit ORDER BY.
  -- Avoids jsonb_agg(DISTINCT ... ORDER BY jsonb_build_object(...)) which sorts by
  -- jsonb text representation (count key sorts before value key alphabetically),
  -- producing ascending-count order instead of the required count DESC, value ASC.
  detail_hist_ability AS (
    SELECT ds.bucket, ds.ability AS value,
           COUNT(DISTINCT ds.player_key) AS cnt,
           tc.player_count
    FROM detail_slots ds
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    WHERE ds.ability IS NOT NULL
    GROUP BY ds.bucket, ds.ability, tc.player_count
  ),
  detail_hist_item AS (
    SELECT ds.bucket, ds.held_item AS value,
           COUNT(DISTINCT ds.player_key) AS cnt,
           tc.player_count
    FROM detail_slots ds
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    WHERE ds.held_item IS NOT NULL
    GROUP BY ds.bucket, ds.held_item, tc.player_count
  ),
  detail_hist_nature AS (
    SELECT ds.bucket, ds.nature AS value,
           COUNT(DISTINCT ds.player_key) AS cnt,
           tc.player_count
    FROM detail_slots ds
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    WHERE ds.nature IS NOT NULL
    GROUP BY ds.bucket, ds.nature, tc.player_count
  ),
  detail_hist_tera AS (
    SELECT ds.bucket, ds.tera_type AS value,
           COUNT(DISTINCT ds.player_key) AS cnt,
           tc.player_count
    FROM detail_slots ds
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    WHERE ds.tera_type IS NOT NULL
    GROUP BY ds.bucket, ds.tera_type, tc.player_count
  ),
  detail_hist_combo AS (
    SELECT ds.bucket, ds.combo AS value,
           COUNT(DISTINCT ds.player_key) AS cnt,
           tc.player_count
    FROM detail_slots ds
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    WHERE ds.combo IS NOT NULL
    GROUP BY ds.bucket, ds.combo, tc.player_count
  ),
  species_histograms AS (
    SELECT
      tc.bucket,
      tc.player_count AS sp_players,
      -- abilities: one row per value, aggregate with correct ordering
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM detail_hist_ability h WHERE h.bucket = tc.bucket) AS abilities,
      -- items
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM detail_hist_item h WHERE h.bucket = tc.bucket) AS items,
      -- natures
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM detail_hist_nature h WHERE h.bucket = tc.bucket) AS natures,
      -- tera types
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM detail_hist_tera h WHERE h.bucket = tc.bucket) AS tera_types,
      -- ability+item combos
      (SELECT jsonb_agg(
         jsonb_build_object('value', h.value, 'count', h.cnt,
           'pct', CASE WHEN h.player_count > 0
                    THEN round(100.0 * h.cnt / h.player_count, 2) ELSE 0 END)
         ORDER BY h.cnt DESC, h.value ASC)
       FROM detail_hist_combo h WHERE h.bucket = tc.bucket) AS ability_items
    FROM target_counts tc
  ),
  -- Moves histogram (unnest in separate CTE)
  moves_agg AS (
    SELECT
      ds.bucket,
      m.move,
      COUNT(DISTINCT ds.player_key)  AS cnt,
      tc.player_count
    FROM detail_slots ds
    CROSS JOIN LATERAL unnest(ds.moves) AS m(move)
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    GROUP BY ds.bucket, m.move, tc.player_count
  ),
  moves_hist AS (
    SELECT
      bucket,
      jsonb_agg(
        jsonb_build_object(
          'value', move,
          'count', cnt,
          'pct', CASE WHEN player_count > 0 THEN round(100.0 * cnt / player_count, 2) ELSE 0 END
        )
        ORDER BY cnt DESC, move ASC
      ) AS moves
    FROM moves_agg
    GROUP BY bucket
  ),
  -- Delta lookup: for each target bucket, find usage_pct at -7d and -30d buckets
  delta_buckets AS (
    SELECT
      tc.bucket                                                                    AS current_bucket,
      date_trunc(p_period_type, tc.bucket - INTERVAL '7 days')::date              AS bucket_7d,
      date_trunc(p_period_type, tc.bucket - INTERVAL '30 days')::date             AS bucket_30d
    FROM target_counts tc
  ),
  prior_7d AS (
    SELECT
      db.current_bucket,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * asc_inner.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM delta_buckets db
    JOIN all_species_counts asc_inner
      ON asc_inner.bucket = db.bucket_7d AND asc_inner.species = p_species
    JOIN denoms d ON d.bucket = db.bucket_7d
  ),
  prior_30d AS (
    SELECT
      db.current_bucket,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * asc_inner.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM delta_buckets db
    JOIN all_species_counts asc_inner
      ON asc_inner.bucket = db.bucket_30d AND asc_inner.species = p_species
    JOIN denoms d ON d.bucket = db.bucket_30d
  )
  SELECT
    tc.bucket AS period_start,
    (
      CASE p_period_type
        WHEN 'day'   THEN tc.bucket
        WHEN 'week'  THEN tc.bucket + INTERVAL '6 days'
        WHEN 'month' THEN (date_trunc('month', tc.bucket) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END
    )::date AS period_end,
    CASE WHEN d.bucket_total > 0
      THEN round(100.0 * tc.player_count / d.bucket_total, 2)
      ELSE 0 END                                                  AS usage_pct,
    COALESCE(br.species_rank, 0)                                  AS rank,
    d.bucket_total                                                AS sample_size,
    -- NULL when prior bucket has no row for the species (matches computeDelta semantics)
    CASE WHEN p7.usage_pct IS NOT NULL
      THEN round(
        (CASE WHEN d.bucket_total > 0 THEN round(100.0 * tc.player_count / d.bucket_total, 2) ELSE 0 END)
        - p7.usage_pct, 2)
      ELSE NULL END                                               AS usage_change_7d,
    CASE WHEN p30.usage_pct IS NOT NULL
      THEN round(
        (CASE WHEN d.bucket_total > 0 THEN round(100.0 * tc.player_count / d.bucket_total, 2) ELSE 0 END)
        - p30.usage_pct, 2)
      ELSE NULL END                                               AS usage_change_30d,
    COALESCE(sh.abilities,     '[]'::jsonb)                       AS abilities,
    COALESCE(sh.items,         '[]'::jsonb)                       AS items,
    COALESCE(sh.natures,       '[]'::jsonb)                       AS natures,
    COALESCE(mh.moves,         '[]'::jsonb)                       AS moves,
    COALESCE(sh.tera_types,    '[]'::jsonb)                       AS tera_types,
    COALESCE(sh.ability_items, '[]'::jsonb)                       AS ability_items
  FROM target_counts tc
  INNER JOIN denoms d ON d.bucket = tc.bucket
  LEFT JOIN bucket_ranks br ON br.bucket = tc.bucket
  LEFT JOIN species_histograms sh ON sh.bucket = tc.bucket
  LEFT JOIN moves_hist mh ON mh.bucket = tc.bucket
  LEFT JOIN prior_7d  p7  ON p7.current_bucket  = tc.bucket
  LEFT JOIN prior_30d p30 ON p30.current_bucket = tc.bucket
  ORDER BY tc.bucket ASC
$$;

COMMENT ON FUNCTION public.get_species_usage_detail(text, text, text, text, int, int) IS
  'Trailing p_limit buckets for one species: usage %, rank, sample size, '
  '7d/30d deltas, and full detail histograms. Used by species detail pages. '
  'nature is cast to ::text so jsonb histogram ORDER BY value stays alphabetical '
  '(not enum declaration order) — see 20260701233927_pokemon_nature_enum.sql.';

GRANT EXECUTE ON FUNCTION public.get_species_usage_detail(text, text, text, text, int, int)
  TO anon, authenticated;
