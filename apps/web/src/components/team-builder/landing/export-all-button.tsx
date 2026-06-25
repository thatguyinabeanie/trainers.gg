"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { exportTeamToShowdown } from "@trainers/pokemon";
import { getErrorMessage } from "@trainers/utils";

import { Button } from "@/components/ui/button";

import { dbPokemonToFlat } from "../pokemon-utils";
import { type LocalDraftRecord } from "../persistence/local-drafts-types";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Serialize a single team (TeamWithPokemon) to a Showdown paste string.
 * Reuses the exact same logic as ExportMenu / buildShowdownText.
 */
function buildShowdownText(record: LocalDraftRecord): string {
  const sorted = [...record.team.team_pokemon]
    .sort((a, b) => a.team_position - b.team_position)
    .flatMap((tp) => (tp.pokemon ? [dbPokemonToFlat(tp.pokemon)] : []));

  return exportTeamToShowdown(sorted);
}

// =============================================================================
// Props
// =============================================================================

interface ExportAllButtonProps {
  /** The records to export — each has a `team: TeamWithPokemon`. */
  records: LocalDraftRecord[];
}

// =============================================================================
// ExportAllButton
// =============================================================================

/**
 * "Export all / Back up all" toolbar button for the /builder landing.
 *
 * Serializes every non-archived draft to a Showdown paste, separates teams
 * with a labelled header (`=== <team name> ===`), and triggers a browser
 * download of a single `trainers-gg-teams.txt` file.
 *
 * Spec §13.3 — mitigates local-draft loss with a one-click downloadable bundle.
 */
export function ExportAllButton({ records }: ExportAllButtonProps) {
  // Non-archived records that can be exported.
  const exportable = records.filter((r) => !r.archived);
  const isEmpty = exportable.length === 0;

  // ---------------------------------------------------------------------------
  // Click handler — all DOM manipulation is event-driven (never during render)
  // ---------------------------------------------------------------------------

  function handleExportAll() {
    if (isEmpty) {
      toast.info("No teams to export.");
      return;
    }

    try {
      const sections = exportable.map((record) => {
        // Team name: use the stored team name, fall back to the record id.
        const name = record.team.name?.trim() || record.id;
        const paste = buildShowdownText(record);
        return `=== ${name} ===\n\n${paste}`;
      });

      const fileContent = sections.join("\n\n");
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "trainers-gg-teams.txt";
      anchor.click();

      // Clean up the object URL after the click is processed.
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportable.length} team${exportable.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Export failed — please try again."));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isEmpty}
      onClick={handleExportAll}
      className="min-h-10 shrink-0 gap-1.5 text-xs sm:min-h-8"
      aria-label={
        isEmpty
          ? "No teams to export"
          : `Export all ${exportable.length} teams as a Showdown text file`
      }
    >
      <Download className="size-3.5" />
      <span className="hidden sm:inline">Back up all</span>
      <span className="sm:hidden">Back up</span>
    </Button>
  );
}
