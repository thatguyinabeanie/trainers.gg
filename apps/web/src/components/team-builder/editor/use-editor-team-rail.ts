"use client";

/**
 * use-editor-team-rail.ts
 *
 * Hook that reads local drafts + folders, groups them into rail sections, and
 * manages expand/collapse state for the EditorTeamRail component.
 *
 * SSR-safe: returns empty sections on the server; tree renders only after
 * hydration via useIsClient().
 *
 * React Compiler on — no useMemo/useCallback/React.memo.
 */

import { useState } from "react";

import { useIsClient } from "@/hooks/use-is-client";

import {
  groupDrafts,
  type DraftSection,
} from "../landing/group-drafts";
import { toDraftSummary, type LocalDraftSummary } from "../landing/team-landing-shared";
import { listLocalDrafts } from "../persistence/local-drafts-store";
import { listManualFolders, listSmartFolders } from "../persistence/local-folders-store";

// =============================================================================
// Public types
// =============================================================================

/**
 * A flat, display-ready section for the editor team rail.
 * Derived from DraftSection but uses LocalDraftSummary instead of LocalDraftRecord.
 */
export interface TeamRailSection {
  /** Stable section identifier (mirrors DraftSection.id). */
  id: string;
  /** Human-readable section heading. */
  label: string;
  /** Display-ready draft summaries for this section. */
  teams: LocalDraftSummary[];
}

/** Return value of useEditorTeamRail. */
export interface EditorTeamRailState {
  sections: TeamRailSection[];
  expanded: Record<string, boolean>;
  toggleSection: (id: string) => void;
  reload: () => void;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Convert a DraftSection (raw records) to a TeamRailSection (display summaries).
 */
function toRailSection(section: DraftSection): TeamRailSection {
  return {
    id: section.id,
    label: section.title,
    teams: section.drafts.map(toDraftSummary),
  };
}

/**
 * Derive the initial expanded state for sections.
 * Always expands Pinned (__pinned__). Expands the section containing the
 * current draft id. All others start collapsed.
 */
function buildInitialExpanded(
  sections: TeamRailSection[],
  currentDraftId: string
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};
  for (const section of sections) {
    const isPinned = section.id === "__pinned__";
    const containsCurrent = section.teams.some((t) => t.id === currentDraftId);
    expanded[section.id] = isPinned || containsCurrent;
  }
  return expanded;
}

/**
 * Read current sections from localStorage (SSR-safe).
 * Uses the "All teams" view (selectedFolderId: null) + "recent" sort —
 * the rail is a quick navigator, not a filtered view.
 */
function readSections(): TeamRailSection[] {
  if (typeof window === "undefined") return [];

  const drafts = listLocalDrafts();
  const manualFolders = listManualFolders();
  const smartFolders = listSmartFolders();

  // "All teams" view, recent sort — Pinned section first, then auto gen→format groups.
  const rawSections: DraftSection[] = groupDrafts(drafts, {
    sort: "recent",
    selectedFolderId: null,
    manualFolders,
    smartFolders,
  });

  // Also append an archived section if there are archived drafts, so the user
  // can navigate to them without leaving the editor.
  const archivedRaw = groupDrafts(drafts, {
    sort: "recent",
    selectedFolderId: "__archived__",
    manualFolders,
    smartFolders,
  });

  const allRaw = [...rawSections, ...archivedRaw];

  return allRaw.map(toRailSection);
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Data + expand/collapse state for the EditorTeamRail.
 *
 * @param currentDraftId - The id of the draft currently open in the editor.
 */
export function useEditorTeamRail(currentDraftId: string): EditorTeamRailState {
  const isClient = useIsClient();

  // Reload key: incrementing it forces a fresh localStorage read on the next render.
  const [reloadKey, setReloadKey] = useState(0);

  // Sections — read from localStorage on every render (keyed by reloadKey).
  // Safe because listLocalDrafts() is a cheap synchronous localStorage read.
  const sections: TeamRailSection[] = isClient ? readSections() : [];

  // Expand state — section ids keyed to open/closed.
  // Lazy-initialized on first client render; incorporates reloadKey so new
  // sections that appear after reload can be added to the record.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    buildInitialExpanded(sections, currentDraftId)
  );

  // When sections change (new section ids appear), ensure they have a default
  // expanded value without clobbering user-toggled state.
  // This is derived state computed during render — no effect needed.
  const sectionsWithDefaults = sections.reduce<Record<string, boolean>>(
    (acc, section) => {
      if (!(section.id in expanded)) {
        const isPinned = section.id === "__pinned__";
        const containsCurrent = section.teams.some(
          (t) => t.id === currentDraftId
        );
        acc[section.id] = isPinned || containsCurrent;
      }
      return acc;
    },
    {}
  );

  // If any new sections appeared, merge them into the expanded record.
  const hasMissing = Object.keys(sectionsWithDefaults).length > 0;
  const effectiveExpanded = hasMissing
    ? { ...expanded, ...sectionsWithDefaults }
    : expanded;

  function toggleSection(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reload() {
    setReloadKey((k) => k + 1);
    // After a reload, re-derive expand defaults to open the current draft's section.
    setExpanded(buildInitialExpanded(readSections(), currentDraftId));
  }

  // Suppress the reloadKey-in-scope lint warning: it's used to trigger re-reads
  // of localStorage via the sections derivation above.
  void reloadKey;

  return {
    sections,
    expanded: effectiveExpanded,
    toggleSection,
    reload,
  };
}
