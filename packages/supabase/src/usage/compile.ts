/**
 * Pure slot-row compiler for the team_slots fact table.
 *
 * WHY pure functions: The mapping from raw per-source rows to insert-ready
 * TeamSlotRow objects must be unit-testable without any DB or framework
 * dependencies. The mutation layer (mutations/team-slots.ts) calls
 * buildTeamSlotRows() and owns all Supabase interaction.
 *
 * DELIBERATE EXCLUSIONS: EVs, IVs, gender, level, and any player name fields
 * are intentionally absent from TeamSlotRow. This is a hard privacy/product
 * constraint — do not add them.
 *
 * TOTAL_PLAYERS DENOMINATOR: Each division group's total_players is the count
 * of distinct playerKeys within that division. Rows with division=null form
 * their own group keyed null. This represents "players WITH team sheets in
 * this event+division", since raw rows ARE the sheet data.
 */

// =============================================================================
// Input / output types
// =============================================================================

/** Source system that produced the raw rows. */
export type TeamSlotSource = "rk9" | "limitless" | "trainers.gg";

/**
 * Event-level metadata resolved by the orchestration layer before compiling.
 * Stamped onto every output row.
 */
export interface EventMeta {
  /** Source system. */
  source: TeamSlotSource;
  /** Composite event key, e.g. "rk9:TO027", "limitless:abc", "trainers.gg:42". */
  eventKey: string;
  /** Showdown format id, e.g. "gen9vgc2025regg". */
  format: string;
  /** ISO date YYYY-MM-DD of the event. */
  eventDate: string;
  /**
   * RK9-only tier; null for other sources.
   * Valid values: 'regional' | 'international' | 'special' | 'worlds'.
   */
  eventTier: string | null;
  /**
   * Whether the event was played online.
   * rk9 = false, trainers.gg = true, limitless = from tournament row.
   */
  isOnline: boolean;
}

/**
 * One raw Pokemon slot read from a source schema, pre-normalized by the reader.
 * The reader is responsible for slug normalization, stat_alignment→nature
 * mapping (rk9), and any source-specific field remapping before calling
 * buildTeamSlotRows.
 */
export interface RawSlotRow {
  /** Source-qualified standing/registration id. */
  playerKey: string;
  /** Age division from RK9; null for Limitless and first-party events. */
  division: string | null;
  /** Placement finish position; null when not recorded. */
  placement: number | null;
  /** Match wins; null when not recorded (rk9 typically omits this). */
  wins: number | null;
  /** Match losses; null when not recorded (rk9 typically omits this). */
  losses: number | null;
  /** Match ties; null when not recorded. */
  ties: number | null;
  /** ISO alpha-2 country code; null if unknown. */
  country: string | null;
  /** Slot position on the team, 1–6. */
  position: number;
  /** Normalized species slug (e.g. "calyrex-ice-rider"). Empty/whitespace rows are skipped. */
  species: string;
  /** Held item slug; null if unknown or absent. */
  heldItem: string | null;
  /** Ability name; null if unknown or absent. */
  ability: string | null;
  /** Tera type; null if not applicable or not recorded. */
  teraType: string | null;
  /**
   * Up to 4 move slugs. May contain null or empty string entries — these are
   * filtered out by buildTeamSlotRows. Order is preserved for non-null entries.
   */
  moves: (string | null)[];
  /**
   * Nature (stat alignment). Mapped by the reader from rk9's stat_alignment
   * field or the trainers.gg sheet's nature field. null for Limitless
   * (not captured by that source).
   */
  nature: string | null;
}

/**
 * Insert-ready team_slots row (snake_case DB columns).
 * Every field maps directly to a column in the team_slots table.
 */
export interface TeamSlotRow {
  /** Source system. */
  source: TeamSlotSource;
  /** Composite event key. */
  event_key: string;
  /** Showdown format id. */
  format: string;
  /** ISO date YYYY-MM-DD. */
  event_date: string;
  /** RK9-only tier; null for other sources. */
  event_tier: string | null;
  /** Whether the event was online. */
  is_online: boolean;
  /**
   * Distinct players with team sheets in this event+division group.
   * Denominator for per-division usage percentages.
   */
  total_players: number;
  /** Source-qualified player/registration id. */
  player_key: string;
  /** Age division; null for non-RK9 sources. */
  division: string | null;
  /** Placement finish position; null when not recorded. */
  placement: number | null;
  /** Match wins; null when not recorded. */
  wins: number | null;
  /** Match losses; null when not recorded. */
  losses: number | null;
  /** Match ties; null when not recorded. */
  ties: number | null;
  /** ISO alpha-2 country code; null if unknown. */
  country: string | null;
  /** Slot position on the team, 1–6. */
  position: number;
  /** Normalized species slug. */
  species: string;
  /** Held item slug; null if absent. */
  held_item: string | null;
  /** Ability name; null if absent. */
  ability: string | null;
  /** Tera type; null if not applicable. */
  tera_type: string | null;
  /** Filtered move slugs — null/empty/whitespace entries removed, order preserved. */
  moves: string[];
  /** Nature; null for Limitless or when not captured by the source. */
  nature: string | null;
  /**
   * Polymorphic source-event FK (Decision 1). Exactly one of these is set for
   * rk9/limitless rows; both null for trainers.gg. Drives ON DELETE CASCADE
   * from the parent event to its team_slots rows.
   */
  rk9_event_id: string | null;
  limitless_tournament_id: string | null;
}

// =============================================================================
// Private helpers
// =============================================================================

/** Sentinel used as a Map key for null divisions. Cannot appear in real data. */
const NULL_DIV_KEY = "\0null\0";

/** Normalize a division value to a stable map key. */
function divisionKey(division: string | null): string {
  return division ?? NULL_DIV_KEY;
}

/**
 * Filter move slots: remove null, empty string, and whitespace-only entries.
 * Order of remaining entries is preserved.
 */
function filterMoves(moves: (string | null)[]): string[] {
  return moves.filter((m): m is string => m !== null && m.trim().length > 0);
}

/**
 * Compute total_players for each division group.
 * Each group's count = distinct playerKey values within that division.
 *
 * @param rows Raw slot rows for the event (may include rows with blank species).
 * @returns Map from divisionKey sentinel → player count.
 */
function computeTotalPlayersByDiv(rows: RawSlotRow[]): Map<string, number> {
  // Map<divisionKey, Set<playerKey>>
  const playersByDiv = new Map<string, Set<string>>();

  for (const row of rows) {
    const dk = divisionKey(row.division);
    let players = playersByDiv.get(dk);
    if (players === undefined) {
      players = new Set();
      playersByDiv.set(dk, players);
    }
    players.add(row.playerKey);
  }

  const counts = new Map<string, number>();
  for (const [dk, players] of playersByDiv) {
    counts.set(dk, players.size);
  }
  return counts;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compile raw per-source slot rows into insert-ready TeamSlotRow objects.
 *
 * Processing rules:
 * 1. total_players: count distinct playerKey values per division group.
 *    Rows with division=null form one group. Every output row is stamped with
 *    its group's count.
 * 2. moves: null/empty/whitespace entries are filtered out. Order preserved.
 * 3. Rows with empty/whitespace species are skipped (defensive — do not throw).
 * 4. All EventMeta fields are stamped on every output row.
 * 5. camelCase input fields are mapped to snake_case output columns.
 *
 * @param meta Event-level metadata resolved by the orchestration layer.
 * @param raw  Flat list of raw slot rows for this event.
 * @returns Insert-ready team_slots rows; [] when input is empty.
 */
export function buildTeamSlotRows(
  meta: EventMeta,
  raw: RawSlotRow[]
): TeamSlotRow[] {
  if (raw.length === 0) return [];

  // Decision 1: derive the polymorphic source-event FK from the event key.
  // event_key is source-qualified ("rk9:TO027" / "limitless:12345" /
  // "trainers.gg:42"); the native parent id is the part after the first colon.
  // Only rk9/limitless have a source-schema parent → an FK column; trainers.gg
  // keeps both null.
  const nativeEventId = meta.eventKey.slice(meta.eventKey.indexOf(":") + 1);
  const rk9EventId = meta.source === "rk9" ? nativeEventId : null;
  const limitlessTournamentId =
    meta.source === "limitless" ? nativeEventId : null;

  // Pre-compute total_players per division group (includes blank-species rows
  // because those players still participated — the blank will be skipped below
  // but the player still counts toward the denominator).
  const totalPlayersByDiv = computeTotalPlayersByDiv(raw);

  const output: TeamSlotRow[] = [];

  for (const row of raw) {
    // Skip rows with empty or whitespace-only species (defensive guard).
    if (row.species.trim().length === 0) continue;

    const dk = divisionKey(row.division);
    const totalPlayers = totalPlayersByDiv.get(dk) ?? 0;

    output.push({
      // Event-level meta (stamped on every row)
      source: meta.source,
      event_key: meta.eventKey,
      rk9_event_id: rk9EventId,
      limitless_tournament_id: limitlessTournamentId,
      format: meta.format,
      event_date: meta.eventDate,
      event_tier: meta.eventTier,
      is_online: meta.isOnline,
      // Division-group denominator
      total_players: totalPlayers,
      // Player-level fields
      player_key: row.playerKey,
      division: row.division,
      placement: row.placement,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      country: row.country,
      // Slot-level fields
      position: row.position,
      // Trimmed defensively — an untrimmed value would persist and break
      // equality/index lookups against normalized slugs.
      species: row.species.trim(),
      held_item: row.heldItem,
      ability: row.ability,
      tera_type: row.teraType,
      moves: filterMoves(row.moves),
      nature: row.nature,
    });
  }

  return output;
}
