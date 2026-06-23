"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useLocalDrafts } from "../persistence/use-local-drafts";
import { toDraftSummary, draftEditorHref } from "./team-landing-shared";
import { TeamRow } from "./team-row";

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
// TeamsLandingClient
// =============================================================================

/**
 * Client component for the /builder landing page.
 *
 * Reads local drafts from localStorage via useLocalDrafts, and renders:
 * - A loading skeleton while hydrating
 * - A friendly empty state when no drafts exist
 * - A list of TeamRow items with delete support
 *
 * Phase 1: local-drafts-only, additive (no DB, no auth required).
 */
export function TeamsLandingClient() {
  const { drafts, hydrated, createDraft, deleteDraft } = useLocalDrafts();
  const router = useRouter();

  function handleNewTeam() {
    const rec = createDraft();
    router.push(draftEditorHref(rec.id));
  }

  function handleDelete(id: string) {
    deleteDraft(id);
    toast.success("Team deleted");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
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

      {/* Content states */}
      {!hydrated ? (
        <LandingSkeleton />
      ) : drafts.length === 0 ? (
        <EmptyState onNewTeam={handleNewTeam} />
      ) : (
        <div className="space-y-0.5">
          {drafts.map((draft) => (
            <TeamRow
              key={draft.id}
              summary={toDraftSummary(draft)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
