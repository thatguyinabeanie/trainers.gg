/**
 * Team Landing — shared types & helpers
 *
 * Cross-sibling contract for the /builder landing components (team-row,
 * teams-landing-client). Per the nextjs-conventions "sibling components must not
 * import from each other" rule, shared symbols live here and both siblings
 * import from this module.
 */

import { getActiveFormats } from "@trainers/pokemon";

import { type LocalDraftRecord } from "../persistence/local-drafts-types";

/** Up-to-6 species slots used to render a row's sprite strip. */
export interface DraftSpeciesSlot {
  species: string | null;
  isShiny: boolean;
}

/** Display-ready summary of a local draft for the landing list. */
export interface LocalDraftSummary {
  id: string;
  name: string;
  format: string | null;
  /** Count of filled (non-null species) team_pokemon slots, 0-6. */
  filledCount: number;
  /** Species slots ordered by team_position, filled slots only. */
  species: DraftSpeciesSlot[];
  updatedAt: string;
  /**
   * Whether the team passes format legality checks.
   * Legal = team.format_legal !== false AND every filled pokemon's
   * format_legal !== false. Mirrors the isIllegal() logic in predicate-eval.ts.
   */
  isLegal: boolean;
  /**
   * Origin of this draft. "account" = DB-backed (synced), "local" = localStorage only.
   * Defaults to "local" for back-compat with existing records that lack the field.
   */
  source: "local" | "account";
}

/** Default display name for an unnamed draft. */
export const UNTITLED_DRAFT_NAME = "Untitled Team";

/** Derive a display-ready summary from a stored draft record. */
export function toDraftSummary(record: LocalDraftRecord): LocalDraftSummary {
  const filled = record.team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position);

  // Legal = team-level format_legal is not explicitly false, AND every filled
  // pokemon's format_legal is not explicitly false. Mirrors isIllegal() in
  // predicate-eval.ts (inverted).
  const isLegal =
    record.team.format_legal !== false &&
    filled.every((tp) => tp.pokemon?.format_legal !== false);

  return {
    id: record.id,
    name: record.team.name?.trim() || UNTITLED_DRAFT_NAME,
    format: record.team.format,
    filledCount: filled.length,
    species: filled.map((tp) => ({
      species: tp.pokemon?.species ?? null,
      isShiny: tp.pokemon?.is_shiny ?? false,
    })),
    updatedAt: record.updatedAt,
    isLegal,
    source: record.source ?? "local",
  };
}

/** Build the editor route href for a draft id. */
export function draftEditorHref(id: string): string {
  return `/builder/t/${id}`;
}

// =============================================================================
// Save-local payload helper
// =============================================================================

/**
 * Build the payload expected by the save-local teams API from a local draft.
 *
 * Mirrors the inline mapping in `local-builder-workspace.tsx` (handleSaveToAccount,
 * ~lines 196-211): filters out empty slots, sorts by team_position, and strips the
 * synthetic negative `id` field before submitting to the server.
 *
 * Centralised here so the login-reconcile banner and the workspace can share
 * identical behaviour without importing from each other.
 */
export function toSaveLocalPayload(
  record: LocalDraftRecord,
  altId: number
): {
  altId: number;
  name: string;
  format: string;
  pokemon: Record<string, unknown>[];
} {
  const pokemon = record.team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => {
      const { id: _id, ...pokemonData } = tp.pokemon!;
      return pokemonData as Record<string, unknown>;
    });

  return {
    altId,
    name: record.team.name || "Untitled Team",
    format: record.team.format || getActiveFormats()[0]?.id || "",
    pokemon,
  };
}

/** Props for the name-first TeamRow on the landing. */
export interface TeamRowProps {
  summary: LocalDraftSummary;
  /**
   * Whether the current user is signed in. Affects the sync badge:
   * - undefined/false + source "local" → "Local-only" (lock icon, muted)
   * - true + source "local" → "Local" (cloud icon, amber/muted — unsaved draft)
   * - source "account" → "Synced" (check icon, teal/emerald — DB-backed)
   */
  isAuthenticated?: boolean;
  /** Delete this draft (handled by the row's overflow menu). */
  onDelete?: (id: string) => void;
  /**
   * Species strings whose sprites should receive a subtle teal highlight.
   * Used to surface search-matched pokemon in search results.
   */
  highlightSpecies?: string[];
  /**
   * When provided, adds a "Peek" item to the row's overflow menu.
   * The mobile quick-look sheet is opened from here.
   */
  onPeek?: (id: string) => void;
  // ---------------------------------------------------------------------------
  // Milestone B — optional context actions (all additive; row unchanged when absent)
  // ---------------------------------------------------------------------------
  /** Whether this draft is currently pinned. */
  pinned?: boolean;
  /** Whether this draft is currently archived. */
  archived?: boolean;
  /**
   * When provided, adds a Pin/Unpin item to the row's overflow menu.
   * Label derives from `pinned`.
   */
  onTogglePin?: (id: string) => void;
  /**
   * When provided, adds an Archive/Unarchive item to the row's overflow menu.
   * Label derives from `archived`.
   */
  onToggleArchive?: (id: string) => void;
  /** Manual folders available for the "Move to folder" submenu. */
  manualFolders?: { id: string; name: string }[];
  /** IDs of the folders this draft already belongs to (drives checkmarks). */
  memberFolderIds?: string[];
  /**
   * When provided alongside `manualFolders`, adds a "Move to folder" submenu.
   * Toggles membership: adds if absent, removes if present.
   */
  onToggleFolder?: (id: string, folderId: string) => void;
  // ---------------------------------------------------------------------------
  // Milestone C — bulk selection (all additive; row unchanged when absent)
  // ---------------------------------------------------------------------------
  /**
   * When true, a leading Checkbox is rendered for bulk selection.
   * Desktop: revealed on group-hover or when any selection is active.
   * Mobile: always tappable (≥40px tap target).
   */
  selectable?: boolean;
  /** Whether this draft is currently selected in the bulk selection set. */
  selected?: boolean;
  /**
   * Called when the row's checkbox is toggled.
   * `opts.shift` is true when the user held Shift while clicking —
   * the parent should treat this as a range selection.
   */
  onToggleSelect?: (id: string, opts: { shift: boolean }) => void;
  // ---------------------------------------------------------------------------
  // Milestone C — drag reorder (all additive; row unchanged when absent)
  // ---------------------------------------------------------------------------
  /**
   * When true, a grip handle is rendered for drag-reorder.
   * Also enables "Move up" / "Move down" in the overflow menu (tap/keyboard
   * fallback for mobile and keyboard users).
   */
  reorderable?: boolean;
  /**
   * Whether this row can be moved up (i.e. it is not the first item).
   * Used to disable the "Move up" menu item.
   */
  canMoveUp?: boolean;
  /**
   * Whether this row can be moved down (i.e. it is not the last item).
   * Used to disable the "Move down" menu item.
   */
  canMoveDown?: boolean;
  /**
   * Called when the user selects "Move up" or "Move down" from the overflow
   * menu. `dir` is `"up"` or `"down"`.
   */
  onMove?: (id: string, dir: "up" | "down") => void;
  // ---------------------------------------------------------------------------
  // §10.2 — additional row actions + §5 alt mini-badge
  // ---------------------------------------------------------------------------
  /** Alt accounts available for "Move to alt" / "Duplicate to alt" submenus. */
  alts?: { id: number; username: string }[];
  /**
   * When true, renders a small muted "@altUsername" badge near the format/sync
   * badges. Only meaningful for account-sourced rows shown in the "All alts" view.
   */
  showAltBadge?: boolean;
  /**
   * The username of the alt that owns this team (account rows).
   * Displayed in the alt mini-badge when showAltBadge is true.
   */
  altUsername?: string;
  /**
   * Whether this team is currently public (account rows).
   * Drives the "Make public" / "Make private" label in the overflow menu.
   */
  isPublic?: boolean;
  /**
   * Whether this team is local-only and should not sync (local rows).
   * Drives the "Keep local-only" / "Allow syncing" label.
   */
  localOnly?: boolean;
  /** When provided, adds a "Rename" item to the overflow menu. */
  onRename?: (id: string) => void;
  /** When provided, adds a "Duplicate" item to the overflow menu. */
  onDuplicate?: (id: string) => void;
  /**
   * When provided alongside `alts`, adds a "Move to alt ▸" submenu.
   * Calls onMoveToAlt(id, altId) when the user picks an alt.
   */
  onMoveToAlt?: (id: string, altId: number) => void;
  /**
   * When provided alongside `alts`, adds a "Duplicate to alt ▸" submenu.
   * Calls onDuplicateToAlt(id, altId) when the user picks an alt.
   */
  onDuplicateToAlt?: (id: string, altId: number) => void;
  /** When provided, adds an "Export (Showdown)" item to the overflow menu. */
  onExport?: (id: string) => void;
  /**
   * When provided and summary.source === "account", adds a "Make public" /
   * "Make private" toggle to the overflow menu. Passes !isPublic as the new value.
   */
  onMakePublic?: (id: string, isPublic: boolean) => void;
  /**
   * When provided and summary.source === "local", adds a "Keep local-only" /
   * "Allow syncing" toggle to the overflow menu. Passes !localOnly as the new value.
   */
  onToggleLocalOnly?: (id: string, localOnly: boolean) => void;
}
