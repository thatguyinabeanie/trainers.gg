"use client";

/**
 * editor-team-rail.tsx
 *
 * A collapsible team-navigation rail for the editor route (/builder/t/[id]).
 * Displays a grouped tree of local drafts (mirroring the landing rail's sections)
 * and provides create actions — without leaving the workspace.
 *
 * Isolated from the landing: reads the same localStorage stores but owns its own
 * UI state. Does NOT modify FolderRail or the landing client.
 *
 * Bundle guard: imports ONLY draft/folder data helpers, sprites, and the router.
 * Never imports use-calc-state or @smogon/calc.
 *
 * React Compiler on — no useMemo/useCallback/React.memo.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Upload } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { createLocalDraft } from "../persistence/local-drafts-store";
import { draftEditorHref } from "../landing/team-landing-shared";
import { useEditorTeamRail } from "./use-editor-team-rail";

// =============================================================================
// Props
// =============================================================================

export interface EditorTeamRailProps {
  /** The id of the draft currently open in the editor. Used to highlight the active row. */
  currentDraftId: string;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Top create-action buttons rendered above the section tree.
 */
interface CreateActionsProps {
  onNewTeam: () => void;
  onImport: () => void;
}

function CreateActions({ onNewTeam, onImport }: CreateActionsProps) {
  return (
    <div className="flex flex-col gap-1 px-2 pb-2 pt-1">
      <button
        type="button"
        onClick={onNewTeam}
        className={cn(
          "flex min-h-8 w-full items-center gap-1.5 rounded-md px-2 py-1.5",
          "text-sm font-medium text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <Plus className="size-3.5 shrink-0" />
        New team
      </button>

      <button
        type="button"
        onClick={onImport}
        className={cn(
          "flex min-h-8 w-full items-center gap-1.5 rounded-md px-2 py-1.5",
          "text-sm font-medium text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <Upload className="size-3.5 shrink-0" />
        Import a paste
      </button>
    </div>
  );
}

// =============================================================================
// EditorTeamRail
// =============================================================================

/**
 * Team navigation rail for the editor.
 *
 * Layout: create actions (top) → collapsible section tree → empty state (when no teams).
 *
 * Styling matches the landing rail tokens:
 * - Section labels: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
 * - Row height: `min-h-8`; font: `text-sm`
 * - Active row: `bg-teal-500/15 text-teal-700 dark:text-teal-400`
 * - Width: `w-56` (controlled by the mounting wrapper in Task 3)
 */
export function EditorTeamRail({ currentDraftId }: EditorTeamRailProps) {
  const router = useRouter();
  const { sections, expanded, toggleSection, reload } =
    useEditorTeamRail(currentDraftId);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleNewTeam() {
    const draft = createLocalDraft();
    reload();
    router.push(draftEditorHref(draft.id));
  }

  /**
   * "Import a paste" creates a new blank draft and opens it with `?action=import`,
   * which the editor reads to auto-open its ImportDialog on mount. ImportDialog
   * lives inside the workspace's PersistenceProvider, so it can't be driven from
   * the rail directly — the query flag hands off to the editor (mirrors the
   * existing `?action=save` handoff in local-builder-workspace.tsx).
   */
  function handleImport() {
    const draft = createLocalDraft();
    reload();
    router.push(`${draftEditorHref(draft.id)}?action=import`);
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <CreateActions onNewTeam={handleNewTeam} onImport={handleImport} />
        <p className="px-3 text-xs text-muted-foreground">No teams yet.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tree
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-0.5">
      <CreateActions onNewTeam={handleNewTeam} onImport={handleImport} />

      {/* Divider */}
      <div className="mx-2 mb-1 h-px bg-border/60" />

      {sections.map((section) => {
        const isExpanded = expanded[section.id] ?? false;

        return (
          <div key={section.id} className="flex flex-col">
            {/* Section header — toggle expand/collapse */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                "flex min-h-7 w-full items-center gap-1 px-2 py-1",
                "text-xs font-medium uppercase tracking-wide text-muted-foreground",
                "hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={cn(
                  "size-3 shrink-0 transition-transform duration-150",
                  isExpanded && "rotate-90"
                )}
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {section.label}
              </span>
              <span className="text-muted-foreground/60 tabular-nums">
                {section.teams.length}
              </span>
            </button>

            {/* Teams — rendered when section is expanded */}
            {isExpanded && (
              <div className="flex flex-col pb-1 pl-3">
                {section.teams.map((team) => {
                  const isActive = team.id === currentDraftId;
                  const firstSpecies = team.species[0]?.species ?? null;
                  const sprite = firstSpecies
                    ? getPokemonSprite(firstSpecies)
                    : null;

                  return (
                    <Link
                      key={team.id}
                      href={draftEditorHref(team.id)}
                      className={cn(
                        "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* First Pokémon sprite — optional */}
                      {sprite ? (
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          <Image
                            src={sprite.url}
                            alt=""
                            width={sprite.w}
                            height={sprite.h}
                            aria-hidden
                            unoptimized
                            className={cn(
                              "size-5 object-contain",
                              sprite.pixelated && "[image-rendering:pixelated]"
                            )}
                          />
                        </span>
                      ) : (
                        <span className="size-5 shrink-0" aria-hidden="true" />
                      )}

                      {/* Team name */}
                      <span className="min-w-0 flex-1 truncate">{team.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
