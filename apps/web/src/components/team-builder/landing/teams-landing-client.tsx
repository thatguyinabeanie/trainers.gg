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
import { toQuickLookData } from "./quick-look-shared";
import { parseSearchInput, getSuggestions } from "./search-parse";
import { filterDrafts } from "./predicate-eval";
import { groupDrafts, countDrafts, ARCHIVED_VIEW_ID } from "./group-drafts";
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
// Empty state
// =============================================================================

interface EmptyStateProps {
  onNewTeam: () => void;
}

function EmptyState({ onNewTeam }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">
        No teams yet — start building!
      </p>
      <Button
        onClick={onNewTeam}
        size="lg"
        className="min-h-10"
        aria-label="Create your first team"
      >
        <Plus className="size-4" />
        New Team
      </Button>
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
 * 2. Search: filterDrafts(drafts, parseSearchInput(search)) → DraftMatch[]
 * 3. Group: groupDrafts(matchedRecords, { sort, selectedFolderId, manualFolders, smartFolders }) → DraftSection[]
 * 4. Rail counts: countDrafts(ALL drafts, manualFolders, smartFolders) (always over all drafts)
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
    pinDraft,
    archiveDraft,
    toggleDraftFolder,
  } = useLocalDrafts();

  const {
    manualFolders,
    smartFolders,
    createManualFolder,
    deleteManualFolder,
    createSmartFolder,
  } = useFolders();

  const { prefs, setPrefs } = useLandingPrefs();

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
  // Data pipeline
  // ==========================================================================

  const query = parseSearchInput(search);
  const allMatches = filterDrafts(drafts, query);

  // Build a Map<id, matchedSpecies[]> for highlight lookups in renderRow
  const matchMap = new Map<string, string[]>(
    allMatches.map((m) => [m.id, m.matchedSpecies])
  );

  // Matched records (full objects) for grouping
  const matchedIds = new Set(allMatches.map((m) => m.id));
  const matchedRecords = drafts.filter((d) => matchedIds.has(d.id));

  // Group the matched records into sections
  const sections = groupDrafts(matchedRecords, {
    sort: prefs.sort,
    selectedFolderId: prefs.selectedFolderId,
    manualFolders,
    smartFolders,
  });

  // Rail counts are always over ALL drafts (not search-filtered)
  const counts = countDrafts(drafts, manualFolders, smartFolders);

  // Suggestions for SmartSearch
  const suggestions = getSuggestions(search, drafts);

  // Peek record for mobile sheet
  const peekRecord =
    peekId !== null ? drafts.find((d) => d.id === peekId) ?? null : null;

  // ==========================================================================
  // Event handlers
  // ==========================================================================

  function handleNewTeam() {
    const rec = createDraft();
    router.push(draftEditorHref(rec.id));
  }

  function handleDelete(id: string) {
    deleteDraft(id);
    toast.success("Team deleted");
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

  // ==========================================================================
  // renderRow — the render prop passed to TeamSections
  // ==========================================================================

  function renderRow(
    record: (typeof drafts)[number],
    rowProps: { tabIndex: number; ref: (el: HTMLElement | null) => void }
  ) {
    const summary = toDraftSummary(record);
    const highlightSpecies = matchMap.get(record.id) ?? [];

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
  // Derived display state
  // ==========================================================================

  const showSearch = hydrated && (drafts.length > 0 || search.length > 0);
  const isArchiveView = prefs.selectedFolderId === ARCHIVED_VIEW_ID;
  const hasSearchQuery = search.length > 0;
  const hasNoMatches = hasSearchQuery && allMatches.length === 0;

  // Empty state conditions
  const isNoDrafts = hydrated && drafts.length === 0;
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
    <div className="mx-auto w-full max-w-screen-lg px-4 py-6 sm:px-6">
      <div className="flex gap-4">
        {/* Desktop rail — rendered inline */}
        {isClient && !isMobile && (
          <div className="shrink-0">{rail}</div>
        )}

        {/* Main content pane */}
        <div className="min-w-0 flex-1">
          {/* Page header */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
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

            <h1 className="text-xl font-semibold tracking-tight flex-1">
              Your Teams
            </h1>

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

          {/* Search bar */}
          {showSearch && (
            <div className="mb-3 flex items-center gap-2">
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
            </div>
          )}

          {/* Content states */}
          {!hydrated ? (
            <LandingSkeleton />
          ) : isNoDrafts ? (
            <EmptyState onNewTeam={handleNewTeam} />
          ) : isNoSearchMatches ? (
            <NoMatchesState onClear={handleClearSearch} />
          ) : (
            <>
              {/* Toolbar — sort + density controls */}
              <div className="mb-3">
                <LandingToolbar
                  sort={prefs.sort}
                  density={prefs.density}
                  resultCount={allMatches.length}
                  onSortChange={(s) => setPrefs({ sort: s })}
                  onDensityChange={(d) => setPrefs({ density: d })}
                />
              </div>

              {/* Archived-view contextual note */}
              {isArchiveView && <ArchivedViewNote />}

              {/* Sections */}
              <TeamSections
                sections={sections}
                density={prefs.density}
                renderRow={renderRow}
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
            </>
          )}
        </div>
      </div>

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

      {/* TODO Milestone C: drag reorder, bulk-select, undo-delete, FAB */}
    </div>
  );
}
