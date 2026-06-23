"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/use-is-client";
import { useAuthContext } from "@/components/auth/auth-provider";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

import { useLocalDrafts } from "../persistence/use-local-drafts";
import { useFolders } from "../persistence/use-folders";
import { useLandingPrefs } from "../persistence/use-landing-prefs";
import {
  toDraftSummary,
  draftEditorHref,
} from "./team-landing-shared";
import { TeamRow } from "./team-row";
import { SmartSearch } from "./smart-search";
import { LandingToolbar } from "./landing-toolbar";
import { FolderRail } from "./folder-rail";
import { TeamSections } from "./team-sections";
import { CriteriaBuilder } from "./criteria-builder";
import { QuickLook } from "./quick-look";
import { QuickLookSheet } from "./quick-look-sheet";
import { BulkActionBar } from "./bulk-action-bar";
import { LandingEmptyState } from "./empty-state";
import { toQuickLookData } from "./quick-look-shared";
import { parseSearchInput, getSuggestions } from "./search-parse";
import { filterDrafts } from "./predicate-eval";
import { groupDrafts, countDrafts, ARCHIVED_VIEW_ID } from "./group-drafts";
import { useDraftSelection } from "./use-draft-selection";
import { useUndoableDelete } from "./use-undoable-delete";
import { type Predicate } from "./search-types";

// =============================================================================
// Loading skeleton
// =============================================================================

function LandingSkeleton() {
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg bg-muted/50 h-10"
        />
      ))}
    </div>
  );
}

// =============================================================================
// No-matches state
// =============================================================================

interface NoMatchesStateProps {
  onClear: () => void;
}

function NoMatchesState({ onClear }: NoMatchesStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-muted-foreground text-sm">
        No teams matched your search.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        aria-label="Clear search"
      >
        Clear search
      </Button>
    </div>
  );
}

// =============================================================================
// Archived-view notice
// =============================================================================

function ArchivedViewNote() {
  return (
    <p className="text-muted-foreground mb-3 text-xs">
      Viewing archived teams. Archived teams are hidden from the main list.
    </p>
  );
}

// =============================================================================
// Smart-folder dialog wrapper
// =============================================================================

interface SmartFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName?: string;
  initialCriteria?: Predicate[];
  onSave: (name: string, criteria: Predicate[]) => void;
}

function SmartFolderDialog({
  open,
  onOpenChange,
  title,
  initialName,
  initialCriteria,
  onSave,
}: SmartFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <CriteriaBuilder
          initialName={initialName}
          initialCriteria={initialCriteria}
          onSave={(name, criteria) => {
            onSave(name, criteria);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// TeamsLandingClient
// =============================================================================

/**
 * Client component for the /builder landing page.
 *
 * Two-pane layout (Milestone B):
 * - Left: FolderRail — folder/smart-folder navigation sidebar
 * - Right: header (SmartSearch + New Team) + LandingToolbar + TeamSections
 *
 * Data pipeline:
 * 1. Raw drafts from useLocalDrafts
 * 2. Pending-delete exclusion: pendingIds filtered out BEFORE search/group
 * 3. Search: filterDrafts(drafts, parseSearchInput(search)) → DraftMatch[]
 * 4. Group: groupDrafts(matchedRecords, { sort, selectedFolderId, manualFolders, smartFolders }) → DraftSection[]
 * 5. Rail counts: countDrafts(ALL drafts, manualFolders, smartFolders) (always over all drafts)
 *
 * Bulk-selection (Milestone C):
 * - useDraftSelection(orderedIds) manages which ids are selected
 * - BulkActionBar appears when count > 0, wires Move/Export/Archive/Delete
 * - Delete routes through useUndoableDelete for undo support
 * - selectMode boolean auto-enables when count > 0
 *
 * Quick-look wiring (conditional on useIsClient / useIsMobile):
 * - Desktop: each row is wrapped in a <QuickLook> hovercard
 * - Mobile: rows receive onPeek which opens a single <QuickLookSheet>; rail
 *   is rendered inside a Sheet opened by a "Folders" button in the header
 *
 * Phase 1: local-drafts-only, additive (no DB, no auth required).
 */
export function TeamsLandingClient() {
  const {
    drafts,
    hydrated,
    createDraft,
    deleteDraft,
    archiveDraft,
    pinDraft,
    toggleDraftFolder,
    setDraftSortOrder,
  } = useLocalDrafts();

  const {
    manualFolders,
    smartFolders,
    createManualFolder,
    deleteManualFolder,
    createSmartFolder,
  } = useFolders();

  const { prefs, setPrefs } = useLandingPrefs();

  const { isAuthenticated } = useAuthContext();

  const router = useRouter();
  const isClient = useIsClient();
  const isMobile = useIsMobile();

  // Search state
  const [search, setSearch] = useState("");
  // Mobile peek state: id of the draft whose sheet is currently open
  const [peekId, setPeekId] = useState<string | null>(null);
  // Mobile rail sheet open state
  const [railSheetOpen, setRailSheetOpen] = useState(false);
  // Smart-folder dialog: "new" or "save-as" (pre-filled with current search)
  const [smartFolderDialog, setSmartFolderDialog] = useState<
    | null
    | { mode: "new" }
    | { mode: "save-as"; initialCriteria: Predicate[] }
  >(null);

  // ==========================================================================
  // Undoable delete
  // ==========================================================================

  const { pendingIds, scheduleDelete } = useUndoableDelete({
    onCommit: (items) => items.forEach((item) => deleteDraft(item.id)),
  });

  // ==========================================================================
  // Data pipeline
  // ==========================================================================

  // Filter out pending-delete drafts BEFORE search/group so they vanish immediately
  const visibleDrafts = drafts.filter((d) => !pendingIds.has(d.id));

  const query = parseSearchInput(search);
  const allMatches = filterDrafts(visibleDrafts, query);

  // Matched records (full objects) for grouping
  const matchedIds = new Set(allMatches.map((m) => m.id));
  const matchedRecords = visibleDrafts.filter((d) => matchedIds.has(d.id));

  // Group the matched records into sections
  const sections = groupDrafts(matchedRecords, {
    sort: prefs.sort,
    selectedFolderId: prefs.selectedFolderId,
    manualFolders,
    smartFolders,
  });

  // Rail counts are always over ALL drafts (not search-filtered, not pending-filtered)
  const counts = countDrafts(drafts, manualFolders, smartFolders);

  // Suggestions for SmartSearch
  const suggestions = getSuggestions(search, visibleDrafts);

  // Peek record for mobile sheet
  const peekRecord =
    peekId !== null ? drafts.find((d) => d.id === peekId) ?? null : null;

  // ==========================================================================
  // Bulk selection — ordered ids from the currently visible rows
  // ==========================================================================

  const orderedIds = matchedRecords.map((d) => d.id);
  const { selected, isSelected, count, toggle, toggleRange, clear } =
    useDraftSelection(orderedIds);

  // ==========================================================================
  // Event handlers
  // ==========================================================================

  function handleNewTeam() {
    const rec = createDraft();
    router.push(draftEditorHref(rec.id));
  }

  function handleDelete(id: string) {
    const record = drafts.find((d) => d.id === id);
    if (!record) return;
    scheduleDelete([record]);
    if (peekId === id) setPeekId(null);
  }

  function handleClearSearch() {
    setSearch("");
  }

  function handleTogglePin(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    pinDraft(id, !draft.pinned);
  }

  function handleToggleArchive(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    const willArchive = !draft.archived;
    archiveDraft(id, willArchive);
    toast.success(willArchive ? "Team archived" : "Team unarchived");
    if (peekId === id) setPeekId(null);
  }

  function handleToggleFolder(id: string, folderId: string) {
    toggleDraftFolder(id, folderId);
  }

  function handleSelectFolder(folderId: string | null) {
    setPrefs({ selectedFolderId: folderId });
    setRailSheetOpen(false);
  }

  function handleToggleRailCollapsed() {
    setPrefs({ railCollapsed: !prefs.railCollapsed });
  }

  function handleCreateManualFolder(name: string) {
    createManualFolder(name);
  }

  function handleDeleteManualFolder(id: string) {
    deleteManualFolder(id);
    // If this folder was selected, reset to "All teams"
    if (prefs.selectedFolderId === id) {
      setPrefs({ selectedFolderId: null });
    }
  }

  function handleOpenSmartFolderNew() {
    setSmartFolderDialog({ mode: "new" });
  }

  function handleSaveAsSmartFolder() {
    const currentPredicates = parseSearchInput(search).predicates;
    setSmartFolderDialog({ mode: "save-as", initialCriteria: currentPredicates });
  }

  function handleSmartFolderSave(name: string, criteria: Predicate[]) {
    createSmartFolder(name, criteria);
    toast.success(`Smart folder "${name}" created`);
    setSmartFolderDialog(null);
  }

  // --------------------------------------------------------------------------
  // Row toggle-select: shift-click → toggleRange, plain click → toggle
  // --------------------------------------------------------------------------

  function handleToggleSelect(id: string, opts: { shift: boolean }) {
    if (opts.shift) {
      toggleRange(id);
    } else {
      toggle(id);
    }
  }

  // --------------------------------------------------------------------------
  // Bulk action handlers
  // --------------------------------------------------------------------------

  function handleBulkMoveToFolder(folderId: string) {
    for (const id of selected) {
      toggleDraftFolder(id, folderId);
    }
    toast.success(`Moved ${count} team${count === 1 ? "" : "s"} to folder`);
    clear();
  }

  function handleBulkArchive() {
    for (const id of selected) {
      archiveDraft(id, true);
    }
    toast.success(`Archived ${count} team${count === 1 ? "" : "s"}`);
    clear();
  }

  function handleBulkDelete() {
    const records = drafts.filter((d) => selected.has(d.id));
    if (records.length === 0) return;
    scheduleDelete(records);
    clear();
  }

  function handleBulkExport() {
    // Serialize selected drafts to JSON and trigger a browser download
    const records = drafts.filter((d) => selected.has(d.id));
    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `teams-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} team${count === 1 ? "" : "s"}`);
    clear();
  }

  // ==========================================================================
  // renderRow — the render prop passed to TeamSections
  // ==========================================================================

  function renderRow(
    record: (typeof drafts)[number],
    rowProps: { tabIndex: number; ref: (el: HTMLElement | null) => void }
  ) {
    const summary = toDraftSummary(record);
    const highlightSpecies =
      allMatches.find((m) => m.id === record.id)?.matchedSpecies ?? [];

    // Compute Move up/down availability for this record (used by tap fallback).
    // Only meaningful when reorderable; positions are within the flat list.
    const allIds = reorderable
      ? sections.flatMap((s) => s.drafts.map((d) => d.id))
      : [];
    const rowIndex = reorderable ? allIds.indexOf(record.id) : -1;
    const canMoveUp = reorderable && rowIndex > 0;
    const canMoveDown = reorderable && rowIndex >= 0 && rowIndex < allIds.length - 1;

    const row = (
      // The outer div carries the tabIndex and ref so TeamSections can manage
      // roving tabindex focus across sections.
      <div
        key={record.id}
        ref={rowProps.ref}
        tabIndex={rowProps.tabIndex}
        className="outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 rounded-lg"
      >
        <TeamRow
          summary={summary}
          highlightSpecies={highlightSpecies}
          pinned={record.pinned}
          archived={record.archived}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          manualFolders={manualFolders}
          memberFolderIds={record.folderIds}
          onToggleFolder={handleToggleFolder}
          onDelete={handleDelete}
          onPeek={isClient && isMobile ? (id) => setPeekId(id) : undefined}
          // Desktop: always render checkbox (CSS hover-reveal handles visibility).
          // Mobile: always render checkbox in select-mode (isMobile) so tap targets are there.
          selectable={isClient}
          selected={isSelected(record.id)}
          onToggleSelect={handleToggleSelect}
          // Reorder — drag handle + Move up/down menu items (Milestone C)
          reorderable={reorderable}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMove={reorderable ? handleMove : undefined}
        />
      </div>
    );

    // Desktop: wrap in QuickLook hovercard
    if (isClient && !isMobile) {
      return (
        <QuickLook key={record.id} data={toQuickLookData(record)}>
          {row}
        </QuickLook>
      );
    }

    return row;
  }

  // ==========================================================================
  // Drag reorder — only active in custom sort mode for All-teams or manual-folder
  // views (both produce a single flat section that spans the whole list).
  // ==========================================================================

  /**
   * True when the current view supports drag-and-drop / Move up|down reorder.
   * Conditions: sort === "custom" AND (All-teams view OR a manual folder view).
   * Smart folders, archived view, and non-custom sorts are not reorderable.
   */
  const isManualFolderSelected =
    prefs.selectedFolderId !== null &&
    prefs.selectedFolderId !== ARCHIVED_VIEW_ID &&
    manualFolders.some((f) => f.id === prefs.selectedFolderId);

  const reorderable =
    prefs.sort === "custom" &&
    (prefs.selectedFolderId === null || isManualFolderSelected);

  /**
   * Renumber sortOrder for every draft in the visible reorderable list.
   * After a drag or Move up/down the caller provides the new ordered array of
   * ids; we assign `sortOrder = index` to each so the persisted order matches.
   */
  function renumberSortOrders(orderedDraftIds: string[]): void {
    for (let i = 0; i < orderedDraftIds.length; i++) {
      const id = orderedDraftIds[i];
      if (id !== undefined) {
        setDraftSortOrder(id, i);
      }
    }
  }

  /**
   * Called by TeamSections when a drag-drop completes.
   * `fromId` is the draft that was dragged; `toIndex` is the destination (0-based
   * within the visible flat list produced by groupDrafts).
   */
  function handleDragReorder(fromId: string, toIndex: number): void {
    // Use the sections computed above to get the current display order
    const allIds = sections.flatMap((s) => s.drafts.map((d) => d.id));
    const fromIndex = allIds.indexOf(fromId);
    if (fromIndex === -1) return;

    // Build the new order by moving the item
    const newOrder = [...allIds];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, fromId);

    renumberSortOrders(newOrder);
  }

  /**
   * Called by the row's "Move up" / "Move down" overflow menu items.
   * Swaps the draft with its neighbor, then renumbers all sortOrders.
   */
  function handleMove(id: string, dir: "up" | "down"): void {
    const allIds = sections.flatMap((s) => s.drafts.map((d) => d.id));
    const idx = allIds.indexOf(id);
    if (idx === -1) return;

    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= allIds.length) return;

    const newOrder = [...allIds];
    // Swap
    const temp = newOrder[idx];
    const targetItem = newOrder[targetIdx];
    if (temp === undefined || targetItem === undefined) return;
    newOrder[idx] = targetItem;
    newOrder[targetIdx] = temp;

    renumberSortOrders(newOrder);
  }

  // ==========================================================================
  // Derived display state
  // ==========================================================================

  const showSearch = hydrated && (visibleDrafts.length > 0 || search.length > 0);
  const isArchiveView = prefs.selectedFolderId === ARCHIVED_VIEW_ID;
  const hasSearchQuery = search.length > 0;
  const hasNoMatches = hasSearchQuery && allMatches.length === 0;

  // Empty state conditions
  const isNoSearchMatches = hydrated && hasNoMatches;

  // ==========================================================================
  // Rail component (shared between desktop inline and mobile Sheet)
  // ==========================================================================

  const rail = (
    <FolderRail
      selectedFolderId={prefs.selectedFolderId}
      onSelect={handleSelectFolder}
      manualFolders={manualFolders}
      smartFolders={smartFolders}
      counts={counts}
      collapsed={isMobile ? false : prefs.railCollapsed}
      onToggleCollapsed={handleToggleRailCollapsed}
      onCreateManualFolder={handleCreateManualFolder}
      onDeleteManualFolder={handleDeleteManualFolder}
      onCreateSmartFolder={handleOpenSmartFolderNew}
    />
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* Flush-left, full-height sidebar — desktop only, hidden when there are no drafts */}
      {isClient && !isMobile && !(hydrated && drafts.length === 0) && (
        <aside
          className={cn(
            "bg-muted/30 shrink-0 self-stretch overflow-y-auto border-r border-border/40",
            // Slim icon-strip padding when collapsed; roomier when expanded
            prefs.railCollapsed ? "px-1 py-3" : "p-3"
          )}
        >
          {rail}
        </aside>
      )}

      {/* Main column — scrolls vertically; centered content, footer pinned to the bottom */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1">
          <PageContainer>
            {hydrated && drafts.length === 0 ? (
              <LandingEmptyState
                variant={isAuthenticated ? "authed" : "guest"}
                onNewTeam={handleNewTeam}
              />
            ) : (
              <div className="min-w-0">
            {/* Page header — tournaments pattern: title left, actions right */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h1 className="text-3xl font-bold">Your Teams</h1>

              <div className="flex shrink-0 items-center gap-2">
                {/* Mobile: Folders button that opens the rail in a Sheet */}
                {isClient && isMobile && (
                  <Sheet open={railSheetOpen} onOpenChange={setRailSheetOpen}>
                    <SheetTrigger
                      className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      aria-label="Open folders"
                    >
                      <FolderOpen className="size-4" />
                      Folders
                    </SheetTrigger>
                    <SheetContent side="left" className="overflow-y-auto p-0">
                      <SheetHeader className="sr-only">
                        <SheetTitle>Folders</SheetTitle>
                      </SheetHeader>
                      <div className="p-3">{rail}</div>
                    </SheetContent>
                  </Sheet>
                )}

                <Button
                  onClick={handleNewTeam}
                  size="lg"
                  className="min-h-10 shrink-0"
                  aria-label="Create a new team"
                >
                  <Plus className="size-4" />
                  New Team
                </Button>
              </div>
            </div>

            {/* Toolbar row: "Viewing" label + search + sort/density controls */}
            {showSearch && (
              <div className="mb-3 flex items-center gap-2">
                {/* "Viewing" label — desktop only (mockup) */}
                {isClient && !isMobile && (
                  <span className="text-muted-foreground shrink-0 text-sm">
                    Viewing
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <SmartSearch
                    value={search}
                    onValueChange={setSearch}
                    suggestions={suggestions}
                  />
                </div>

                {/* "Save as smart folder" — only shown when there's an active query */}
                {hasSearchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 shrink-0 gap-1.5 text-xs sm:min-h-8"
                    onClick={handleSaveAsSmartFolder}
                    aria-label="Save as smart folder"
                  >
                    <Zap className="size-3.5" />
                    Save as folder
                  </Button>
                )}

                <LandingToolbar
                  sort={prefs.sort}
                  density={prefs.density}
                  resultCount={allMatches.length}
                  onSortChange={(s) => setPrefs({ sort: s })}
                  onDensityChange={(d) => setPrefs({ density: d })}
                />
              </div>
            )}

            {/* Content states */}
            {!hydrated ? (
              <LandingSkeleton />
            ) : isNoSearchMatches ? (
              <NoMatchesState onClear={handleClearSearch} />
            ) : (
              <>
                {/* Archived-view contextual note */}
                {isArchiveView && <ArchivedViewNote />}

                {/* Sections */}
                <TeamSections
                  sections={sections}
                  density={prefs.density}
                  renderRow={renderRow}
                  reorderable={reorderable}
                  onDragReorder={handleDragReorder}
                  emptyState={
                    isArchiveView ? (
                      <p className="text-muted-foreground py-8 text-center text-sm">
                        No archived teams.
                      </p>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center text-sm">
                        No teams in this folder.
                      </p>
                    )
                  }
                />

                {/* Keyboard-hint strip — desktop only */}
                {isClient && !isMobile && (
                  <p className="text-muted-foreground mt-4 text-xs">
                    <kbd className="font-sans">⌘K</kbd> search
                    {" · "}
                    <kbd className="font-sans">↑↓</kbd> move
                    {" · "}
                    <kbd className="font-sans">↵</kbd> open
                    {" · "}
                    <kbd className="font-sans">Space</kbd> select
                    {" · "}
                    <kbd className="font-sans">⌘\</kbd> rail
                  </p>
                )}
              </>
            )}
              </div>
            )}
          </PageContainer>
        </div>
      </div>

      {/* Bulk-action bar — fixed at bottom, shown when ≥1 row is selected */}
      <BulkActionBar
        selectedCount={count}
        manualFolders={manualFolders}
        onMoveToFolder={handleBulkMoveToFolder}
        onExport={handleBulkExport}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClear={clear}
      />

      {/* Mobile FAB — only after hydration on mobile */}
      {isClient && isMobile && (
        <button
          type="button"
          onClick={handleNewTeam}
          aria-label="New team"
          className="fixed bottom-6 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-colors hover:bg-teal-700 active:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Plus className="size-6" aria-hidden />
          <span className="sr-only">New team</span>
        </button>
      )}

      {/* Mobile quick-look sheet — one instance shared by all rows */}
      {isClient && isMobile && (
        <QuickLookSheet
          data={
            peekRecord
              ? toQuickLookData(peekRecord)
              : { id: "", name: "", format: null, slots: [] }
          }
          open={peekId !== null}
          onOpenChange={(open) => {
            if (!open) setPeekId(null);
          }}
        />
      )}

      {/* Smart-folder dialog */}
      <SmartFolderDialog
        open={smartFolderDialog !== null}
        onOpenChange={(open) => {
          if (!open) setSmartFolderDialog(null);
        }}
        title={
          smartFolderDialog?.mode === "save-as"
            ? "Save search as smart folder"
            : "New smart folder"
        }
        initialName=""
        initialCriteria={
          smartFolderDialog?.mode === "save-as"
            ? smartFolderDialog.initialCriteria
            : undefined
        }
        onSave={handleSmartFolderSave}
      />
    </div>
  );
}
