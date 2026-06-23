/**
 * group-drafts.ts
 *
 * Pure, framework-free draft-grouping engine for the team-builder landing.
 * Powers the section list rendered by the landing rail + content area, as well
 * as the per-folder rail counts displayed as badges in the sidebar.
 *
 * Framework-free — no React imports. All functions are pure (no side-effects).
 *
 * Generation → format taxonomy note:
 * Champions M-A / M-B and Legends Z-A are all generation 9. They are grouped
 * together under "Generation 9" in auto-folders, distinguished only by their
 * format label within that generation bucket.
 */

import { getFormatById, getFormatLabel } from "@trainers/pokemon";

import { type LocalDraftRecord } from "../persistence/local-drafts-types";
import {
  type ManualFolder,
  type SmartFolder,
} from "../persistence/local-folders-types";
import { type SortMode } from "../persistence/landing-prefs-types";
import { filterDrafts } from "./predicate-eval";
import { toDraftSummary } from "./team-landing-shared";

// =============================================================================
// Constants
// =============================================================================

/**
 * Sentinel folder ID that, when passed as `selectedFolderId`, renders the
 * archived view — a single section containing all archived drafts.
 */
export const ARCHIVED_VIEW_ID = "__archived__";

/** Section title shown for drafts with no known format. */
const OTHER_SECTION_TITLE = "Other";

// =============================================================================
// Public types
// =============================================================================

/**
 * A grouped section of drafts for display on the landing.
 *
 * Sections are rendered in order:
 *   - "All teams" view: pinned (if any), then auto gen→format groups
 *   - Manual folder view: a single "manual" section
 *   - Smart folder view: a single "smart" section
 *   - Archived view: a single "archived" section
 */
export interface DraftSection {
  /** Stable section identifier (folder id, format id compound, or sentinel). */
  id: string;
  /** Human-readable section heading. */
  title: string;
  /** Discriminates how the section was produced. */
  kind: "pinned" | "auto" | "manual" | "smart" | "archived";
  /** Ordered drafts belonging to this section. */
  drafts: LocalDraftRecord[];
}

/**
 * Input options for `groupDrafts`.
 */
export interface GroupOptions {
  /** Active sort mode from landing preferences. */
  sort: SortMode;
  /**
   * The currently-selected folder ID from the rail.
   * `null` → "All teams" view.
   * `ARCHIVED_VIEW_ID` → archived view.
   * Any other value → manual or smart folder view.
   */
  selectedFolderId: string | null;
  /** All manual folders from the folders store. */
  manualFolders: readonly ManualFolder[];
  /** All smart folders (seeded + user-created) from the folders store. */
  smartFolders: readonly SmartFolder[];
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Resolve the auto-group key for a draft's format.
 *
 * Returns `{ generationKey, generationLabel, formatLabel }` where:
 * - `generationKey` — stable string key for grouping (e.g. "gen9", "gen8")
 * - `generationLabel` — human-readable generation heading (e.g. "Generation 9")
 * - `formatLabel` — the format's display label from the registry, or "Other"
 */
function resolveAutoGroup(formatId: string | null | undefined): {
  generationKey: string;
  generationLabel: string;
  formatLabel: string;
} {
  if (!formatId) {
    return {
      generationKey: "other",
      generationLabel: OTHER_SECTION_TITLE,
      formatLabel: OTHER_SECTION_TITLE,
    };
  }

  const fmt = getFormatById(formatId);
  if (!fmt) {
    // Unknown format ID — fall back to "Other" but keep the raw id as label
    return {
      generationKey: "other",
      generationLabel: OTHER_SECTION_TITLE,
      formatLabel: getFormatLabel(formatId),
    };
  }

  return {
    generationKey: `gen${fmt.generation}`,
    generationLabel: `Generation ${fmt.generation}`,
    formatLabel: fmt.label,
  };
}

/**
 * Sort an array of `LocalDraftRecord` in-place according to the given `SortMode`.
 *
 * `custom` sort: ascending by `sortOrder` (nulls last), then by `updatedAt` desc
 * as a tiebreaker for unordered drafts.
 * All other sorts are deterministic within their primary key; `updatedAt` desc
 * serves as a stable tiebreaker.
 */
function sortDrafts(drafts: LocalDraftRecord[], sort: SortMode): void {
  drafts.sort((a, b) => {
    switch (sort) {
      case "recent": {
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }

      case "name": {
        const nameA = (a.team.name ?? "").toLowerCase();
        const nameB = (b.team.name ?? "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        // Tiebreak: most-recently-updated first
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }

      case "format": {
        const fmtA = getFormatLabel(a.team.format ?? "").toLowerCase();
        const fmtB = getFormatLabel(b.team.format ?? "").toLowerCase();
        if (fmtA < fmtB) return -1;
        if (fmtA > fmtB) return 1;
        // Within same format, sort by name then updatedAt
        const nameA = (a.team.name ?? "").toLowerCase();
        const nameB = (b.team.name ?? "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }

      case "completeness": {
        const countA = toDraftSummary(a).filledCount;
        const countB = toDraftSummary(b).filledCount;
        if (countB !== countA) return countB - countA;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }

      case "custom": {
        // nulls last: items without a sortOrder come after those with one
        if (a.sortOrder === null && b.sortOrder === null) {
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        }
        if (a.sortOrder === null) return 1;
        if (b.sortOrder === null) return -1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
    }
  });
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Derive an ordered list of `DraftSection` values from a flat drafts array.
 *
 * Selection view (determined by `opts.selectedFolderId`):
 *
 * - `null` ("All teams"):
 *     Archives excluded. Pinned section first (if any pinned non-archived
 *     drafts exist), then auto gen→format sections for the remaining
 *     non-pinned non-archived drafts.
 *
 * - Manual folder ID:
 *     A single section (kind "manual") containing non-archived drafts whose
 *     `folderIds` includes the selected ID.
 *
 * - Smart folder ID:
 *     A single section (kind "smart") containing non-archived drafts that
 *     satisfy the folder's `criteria` predicates via `filterDrafts`.
 *
 * - `ARCHIVED_VIEW_ID`:
 *     A single section (kind "archived") containing all archived drafts.
 *
 * Sorting is applied within every section according to `opts.sort`.
 *
 * Empty sections are omitted.
 */
export function groupDrafts(
  drafts: readonly LocalDraftRecord[],
  opts: GroupOptions
): DraftSection[] {
  const { sort, selectedFolderId, manualFolders, smartFolders } = opts;

  // ------------------------------------------------------------------
  // Archived view
  // ------------------------------------------------------------------
  if (selectedFolderId === ARCHIVED_VIEW_ID) {
    const archived = drafts.filter((d) => d.archived);
    sortDrafts(archived, sort);
    if (archived.length === 0) return [];
    return [
      {
        id: ARCHIVED_VIEW_ID,
        title: "Archived",
        kind: "archived",
        drafts: archived,
      },
    ];
  }

  // ------------------------------------------------------------------
  // Manual folder view
  // ------------------------------------------------------------------
  if (selectedFolderId !== null) {
    const manualFolder = manualFolders.find((f) => f.id === selectedFolderId);
    if (manualFolder) {
      const members = drafts.filter(
        (d) => !d.archived && d.folderIds.includes(selectedFolderId)
      );
      sortDrafts(members, sort);
      if (members.length === 0) return [];
      return [
        {
          id: selectedFolderId,
          title: manualFolder.name,
          kind: "manual",
          drafts: members,
        },
      ];
    }

    // Smart folder view
    const smartFolder = smartFolders.find((f) => f.id === selectedFolderId);
    if (smartFolder) {
      const nonArchived = drafts.filter((d) => !d.archived);
      const matches = filterDrafts(nonArchived, {
        predicates: smartFolder.criteria,
        text: "",
      });
      // filterDrafts returns DraftMatch[] sorted by score — we need the original
      // LocalDraftRecord objects in the same order, then re-sort by sort mode.
      const matchIds = new Set(matches.map((m) => m.id));
      const members = nonArchived.filter((d) => matchIds.has(d.id));
      sortDrafts(members, sort);
      if (members.length === 0) return [];
      return [
        {
          id: selectedFolderId,
          title: smartFolder.name,
          kind: "smart",
          drafts: members,
        },
      ];
    }

    // Unknown folder ID — return empty (folder may have been deleted)
    return [];
  }

  // ------------------------------------------------------------------
  // "All teams" view (selectedFolderId === null)
  // ------------------------------------------------------------------
  const nonArchived = drafts.filter((d) => !d.archived);

  // Custom sort in All-teams view: emit a single flat "all" section ordered
  // by sortOrder (nulls last, updatedAt desc tiebreaker). Drag must span the
  // whole list, so we cannot split into Pinned + gen→format groups here.
  if (sort === "custom") {
    sortDrafts(nonArchived, sort);
    if (nonArchived.length === 0) return [];
    return [
      {
        id: "all",
        kind: "auto",
        title: "All teams",
        drafts: nonArchived,
      },
    ];
  }

  // Pinned section — pinned non-archived drafts
  const pinnedDrafts = nonArchived.filter((d) => d.pinned);
  sortDrafts(pinnedDrafts, sort);

  // Remaining drafts — non-pinned non-archived
  const restDrafts = nonArchived.filter((d) => !d.pinned);

  // Group restDrafts by generation → format
  // Preserve insertion order so generation groups appear newest-gen-first
  // (VGC_FORMATS is ordered newest → oldest, so the first draft encountered
  // for each gen determines the generation order).
  const genOrder: string[] = [];
  const genMeta: Map<string, { label: string }> = new Map();
  // formatKey = `${genKey}:${formatLabel}`
  const formatOrder: string[] = [];
  const formatMeta: Map<string, { genKey: string; formatLabel: string }> = new Map();
  const buckets: Map<string, LocalDraftRecord[]> = new Map();

  for (const draft of restDrafts) {
    const { generationKey, generationLabel, formatLabel } = resolveAutoGroup(
      draft.team.format
    );
    const formatKey = `${generationKey}:${formatLabel}`;

    if (!genMeta.has(generationKey)) {
      genOrder.push(generationKey);
      genMeta.set(generationKey, { label: generationLabel });
    }

    if (!formatMeta.has(formatKey)) {
      formatOrder.push(formatKey);
      formatMeta.set(formatKey, { genKey: generationKey, formatLabel });
    }

    const bucket = buckets.get(formatKey);
    if (bucket) {
      bucket.push(draft);
    } else {
      buckets.set(formatKey, [draft]);
    }
  }

  // Sort each format bucket and build sections
  const autoSections: DraftSection[] = [];
  for (const formatKey of formatOrder) {
    const meta = formatMeta.get(formatKey);
    if (!meta) continue;
    const bucket = buckets.get(formatKey);
    if (!bucket || bucket.length === 0) continue;
    sortDrafts(bucket, sort);
    autoSections.push({
      id: formatKey,
      title: meta.formatLabel,
      kind: "auto",
      drafts: bucket,
    });
  }

  const sections: DraftSection[] = [];
  if (pinnedDrafts.length > 0) {
    sections.push({
      id: "__pinned__",
      title: "Pinned",
      kind: "pinned",
      drafts: pinnedDrafts,
    });
  }
  sections.push(...autoSections);
  return sections;
}

/**
 * Compute rail badge counts for the landing sidebar.
 *
 * Returns:
 * - `all` — number of non-archived drafts (the "All teams" view count)
 * - `archived` — number of archived drafts
 * - `manual[id]` — non-archived member count per manual folder
 * - `smart[id]` — non-archived match count per smart folder
 */
export function countDrafts(
  drafts: readonly LocalDraftRecord[],
  manualFolders: readonly ManualFolder[],
  smartFolders: readonly SmartFolder[]
): {
  all: number;
  archived: number;
  manual: Record<string, number>;
  smart: Record<string, number>;
} {
  const nonArchived = drafts.filter((d) => !d.archived);
  const archived = drafts.filter((d) => d.archived);

  const manual: Record<string, number> = {};
  for (const folder of manualFolders) {
    manual[folder.id] = nonArchived.filter((d) =>
      d.folderIds.includes(folder.id)
    ).length;
  }

  const smart: Record<string, number> = {};
  for (const folder of smartFolders) {
    smart[folder.id] = filterDrafts(nonArchived, {
      predicates: folder.criteria,
      text: "",
    }).length;
  }

  return {
    all: nonArchived.length,
    archived: archived.length,
    manual,
    smart,
  };
}
