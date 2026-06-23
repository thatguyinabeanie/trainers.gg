"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/use-is-client";

import { useLocalDrafts } from "../persistence/use-local-drafts";
import { toDraftSummary, draftEditorHref } from "./team-landing-shared";
import { TeamRow } from "./team-row";
import { SmartSearch } from "./smart-search";
import { QuickLook } from "./quick-look";
import { QuickLookSheet } from "./quick-look-sheet";
import { toQuickLookData } from "./quick-look-shared";
import { parseSearchInput, getSuggestions } from "./search-parse";
import { filterDrafts } from "./predicate-eval";

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
// TeamsLandingClient
// =============================================================================

/**
 * Client component for the /builder landing page.
 *
 * Reads local drafts from localStorage via useLocalDrafts, and renders:
 * - A loading skeleton while hydrating
 * - A SmartSearch input that filters drafts client-side
 * - A friendly empty state when no drafts exist (no search)
 * - A "no matches" state when search yields no results
 * - A list of TeamRow items with delete support
 *
 * Quick-look wiring (conditional on `useIsClient` / `useIsMobile`):
 * - Desktop: each row is wrapped in a `<QuickLook>` hovercard
 * - Mobile: rows receive `onPeek` which opens a single `<QuickLookSheet>`
 *
 * Phase 1: local-drafts-only, additive (no DB, no auth required).
 */
export function TeamsLandingClient() {
  const { drafts, hydrated, createDraft, deleteDraft } = useLocalDrafts();
  const router = useRouter();
  const isClient = useIsClient();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  // Mobile peek state: id of the draft whose sheet is currently open
  const [peekId, setPeekId] = useState<string | null>(null);

  const query = parseSearchInput(search);
  const matches = filterDrafts(drafts, query);

  const suggestions = getSuggestions(search, drafts);

  const peekRecord = peekId !== null
    ? drafts.find((d) => d.id === peekId) ?? null
    : null;

  function handleNewTeam() {
    const rec = createDraft();
    router.push(draftEditorHref(rec.id));
  }

  function handleDelete(id: string) {
    deleteDraft(id);
    toast.success("Team deleted");
    // Close the peek sheet if it was showing the deleted draft
    if (peekId === id) setPeekId(null);
  }

  function handleClearSearch() {
    setSearch("");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Your Teams</h1>
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

      {/* Search bar — shown when hydrated and there are drafts (or a search in progress) */}
      {hydrated && (drafts.length > 0 || search.length > 0) && (
        <div className="mb-4">
          <SmartSearch
            value={search}
            onValueChange={setSearch}
            suggestions={suggestions}
          />
        </div>
      )}

      {/* Content states */}
      {!hydrated ? (
        <LandingSkeleton />
      ) : drafts.length === 0 ? (
        <EmptyState onNewTeam={handleNewTeam} />
      ) : search.length > 0 && matches.length === 0 ? (
        <NoMatchesState onClear={handleClearSearch} />
      ) : (
        <div className="space-y-0.5">
          {matches.map((match) => {
            const record = drafts.find((d) => d.id === match.id);
            if (!record) return null;
            const summary = toDraftSummary(record);

            const row = (
              <TeamRow
                key={record.id}
                summary={summary}
                onDelete={handleDelete}
                highlightSpecies={match.matchedSpecies}
                onPeek={
                  isClient && isMobile
                    ? (id) => setPeekId(id)
                    : undefined
                }
              />
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
          })}
        </div>
      )}

      {/* Mobile quick-look sheet — one instance shared by all rows */}
      {isClient && isMobile && (
        <QuickLookSheet
          data={peekRecord ? toQuickLookData(peekRecord) : { id: "", name: "", format: null, slots: [] }}
          open={peekId !== null}
          onOpenChange={(open) => {
            if (!open) setPeekId(null);
          }}
        />
      )}
    </div>
  );
}
