/**
 * RK9 Scraper Types
 *
 * TypeScript types for data scraped from RK9.gg pages.
 * These represent the intermediate format between raw HTML and database insertion.
 */

// ---------------------------------------------------------------------------
// Event types (from /events/pokemon page)
// ---------------------------------------------------------------------------

/** Event tier classification, derived from event name text */
export type RK9EventTier = "regional" | "international" | "special" | "worlds";

/** A discovered event from the /events/pokemon page */
export interface RK9Event {
  /** RK9's native tournament ID (e.g., 'TO027Rvi7XmbN1f355Nc') */
  eventId: string;
  /** Full event name (e.g., '2026 Toronto Pokémon Regional Championships') */
  name: string;
  /** Date string as shown on page (e.g., 'January 16-18, 2026') */
  dateRaw: string;
  /** Parsed start date (ISO format: '2026-01-16') */
  dateStart: string;
  /** Parsed end date (ISO format, null if single-day) */
  dateEnd: string | null;
  /** City name (e.g., 'Toronto') */
  locationCity: string;
  /** ISO alpha-2 country code (e.g., 'CA') */
  locationCountry: string;
  /** Event tier derived from name */
  tier: RK9EventTier;
  /** Whether this event is in the "upcoming" or "past" section */
  section: "upcoming" | "past";
}

// ---------------------------------------------------------------------------
// Roster types (from /roster/{eventId} page)
// ---------------------------------------------------------------------------

/** Player division (age category) */
export type RK9Division = "masters" | "senior" | "junior";

/** A single player entry from the roster page */
export interface RK9RosterEntry {
  /** Player's first name */
  firstName: string;
  /** Player's last name (may be abbreviated for minors, e.g., 'W.') */
  lastName: string;
  /** ISO alpha-2 country code */
  country: string;
  /** Age division */
  division: RK9Division;
  /** In-game trainer name (may differ from real name) */
  trainerName: string;
  /** Roster entry ID from team list URL path (e.g., '01LXYxHoz4H91RevhzDv') */
  rosterEntryId: string | null;
  /** Final placement/standing (null if not yet available) */
  placement: number | null;
}

// ---------------------------------------------------------------------------
// Team list types (from /teamlist/public/{eventId}/{rosterEntryId} page)
// ---------------------------------------------------------------------------

/** A single Pokemon on a team sheet */
export interface RK9Pokemon {
  /** Original scraped species name (e.g., 'Ogerpon [Hearthflame Mask]') */
  speciesRaw: string;
  /** Tera type (null for formats without Tera, e.g., Champions M-A) */
  teraType: string | null;
  /** Pokemon ability name */
  ability: string;
  /** Held item name */
  heldItem: string;
  /** Array of up to 4 move names */
  moves: string[];
}

/** A complete team sheet for a player */
export interface RK9TeamSheet {
  /** Roster entry ID this team belongs to */
  rosterEntryId: string;
  /** Array of 6 Pokemon (order matters) */
  pokemon: RK9Pokemon[];
}

// ---------------------------------------------------------------------------
// Download state types
// ---------------------------------------------------------------------------

/** Status of downloading data for an event */
export type DownloadStatus =
  | "pending"
  | "roster"
  | "teams"
  | "pairings"
  | "complete"
  | "failed";

/** Metadata about the events list download */
export interface EventsManifest {
  /** When this manifest was last fetched */
  fetchedAt: string;
  /** All discovered events */
  events: RK9Event[];
}

/** Download progress for a specific event */
export interface EventDownloadState {
  /** Tournament ID */
  eventId: string;
  /** Current download status */
  status: DownloadStatus;
  /** How many team sheets have been downloaded */
  teamsDownloaded: number;
  /** Total team sheets to download (from roster count) */
  teamsTotal: number;
  /** Error message if status is 'failed' */
  error?: string;
  /** Timestamp of last activity */
  lastUpdated: string;
}
