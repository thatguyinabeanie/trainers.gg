"use client";

import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

import { exportTeamToShowdown } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { dbPokemonToFlat } from "./pokemon-utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// Types
// =============================================================================

interface ExportMenuProps {
  team: TeamWithPokemon;
}

// =============================================================================
// Helpers
// =============================================================================

/** Build the Showdown-format text from a `TeamWithPokemon`. */
function buildShowdownText(team: TeamWithPokemon): string {
  const sorted = [...team.team_pokemon]
    .sort((a, b) => a.team_position - b.team_position)
    .flatMap((tp) => (tp.pokemon ? [dbPokemonToFlat(tp.pokemon)] : []));

  return exportTeamToShowdown(sorted);
}

// =============================================================================
// ExportMenu
// =============================================================================

/**
 * Dropdown menu for exporting a team to various formats.
 *
 * Menu items:
 * - Copy as Showdown text — copies Showdown export to clipboard
 * - Open in Pokepaste — copies text and opens pokepast.es/create/ in a new tab
 */
export function ExportMenu({ team }: ExportMenuProps) {
  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------

  async function handleCopyShowdown() {
    try {
      const text = buildShowdownText(team);
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.warn("Export/clipboard failed:", err);
      toast.error("Failed to copy — please copy manually.");
    }
  }

  async function handleOpenPokepaste() {
    try {
      const text = buildShowdownText(team);
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste it on Pokepaste.");
      window.open("https://pokepast.es/create/", "_blank", "noopener");
    } catch (err) {
      console.warn("Export/clipboard failed:", err);
      toast.error("Failed to copy — please copy manually.");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyShowdown}>
          <Copy className="size-4" />
          Copy as Showdown text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenPokepaste}>
          <ExternalLink className="size-4" />
          Open in Pokepaste
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
