"use client";

import { useState } from "react";

import { Copy, Upload } from "lucide-react";
import { toast } from "sonner";

import { exportPokemonToShowdown, parsePokemon } from "@trainers/pokemon";
import { containsProfanity } from "@trainers/validators";
import { type Tables } from "@trainers/supabase";

import { updatePokemonAction } from "@/actions/teams";

import { dbPokemonToFlat } from "./pokemon-utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

// =============================================================================
// Types
// =============================================================================

interface PokemonImportExportProps {
  teamId: number;
  pokemon: Tables<"pokemon">;
  onUpdate: () => void;
}

// =============================================================================
// PokemonImportExport
// =============================================================================

/**
 * Per-Pokemon import/export controls rendered in the editor header.
 * Export copies the set to clipboard as Showdown text.
 * Import opens a popover with a textarea to paste a single Showdown set block.
 */
export function PokemonImportExport({
  teamId,
  pokemon,
  onUpdate,
}: PokemonImportExportProps) {
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // ---------------------------------------------------------------------------
  // Export handler
  // ---------------------------------------------------------------------------

  async function handleExport() {
    try {
      const flat = dbPokemonToFlat(pokemon);
      const text = exportPokemonToShowdown(flat);
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      toast.success("Copied set to clipboard");
    } catch (err) {
      console.warn("Export/clipboard failed:", err);
      toast.error("Failed to copy — please copy manually.");
    }
  }

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  async function handleImport() {
    const parsed = parsePokemon(importText.trim());
    if (!parsed) {
      toast.error("Could not parse that set. Check the format and try again.");
      return;
    }

    // Profanity check on nickname — consistent with full-team import
    if (parsed.nickname && containsProfanity(parsed.nickname)) {
      toast.error(
        "Nickname contains inappropriate content. Remove profanity and try again."
      );
      return;
    }

    // Map ShowdownPokemon fields to DB snake_case update fields.
    // moves[] is positional: [0]=move1, [1]=move2, [2]=move3, [3]=move4
    const updateData = {
      species: parsed.species,
      nickname: parsed.nickname ?? null,
      held_item: parsed.item ?? null,
      ability: parsed.ability,
      nature: parsed.nature,
      move1: parsed.moves[0] ?? "",
      move2: parsed.moves[1] ?? null,
      move3: parsed.moves[2] ?? null,
      move4: parsed.moves[3] ?? null,
      level: parsed.level ?? 50,
      is_shiny: parsed.shiny ?? false,
      tera_type: parsed.teraType ?? null,
      gender:
        parsed.gender === "M"
          ? ("Male" as const)
          : parsed.gender === "F"
            ? ("Female" as const)
            : null,
      ev_hp: parsed.evs.hp ?? 0,
      ev_attack: parsed.evs.atk ?? 0,
      ev_defense: parsed.evs.def ?? 0,
      ev_special_attack: parsed.evs.spa ?? 0,
      ev_special_defense: parsed.evs.spd ?? 0,
      ev_speed: parsed.evs.spe ?? 0,
      iv_hp: parsed.ivs.hp ?? 31,
      iv_attack: parsed.ivs.atk ?? 31,
      iv_defense: parsed.ivs.def ?? 31,
      iv_special_attack: parsed.ivs.spa ?? 31,
      iv_special_defense: parsed.ivs.spd ?? 31,
      iv_speed: parsed.ivs.spe ?? 31,
    };

    setIsImporting(true);
    try {
      const result = await updatePokemonAction(teamId, pokemon.id, updateData);
      if (result.success) {
        setImportText("");
        onUpdate();
        toast.success("Set imported successfully");
      } else {
        toast.error(result.error ?? "Failed to import set");
      }
    } catch (err) {
      console.error("[pokemon-import-export] Import failed:", err);
      toast.error("Failed to import set. Check your connection and try again.");
    } finally {
      setIsImporting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center gap-1">
      {/* Export — copy set to clipboard */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleExport}
        aria-label="Copy set to clipboard"
        title="Copy set"
      >
        <Copy className="size-3.5" />
      </Button>

      {/* Import — paste a single Showdown set */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Import set from Showdown text"
              title="Import set"
            />
          }
        >
          <Upload className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-80">
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">
            Paste a Showdown set
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Pikachu @ Light Ball\nAbility: Static\n..."}
            className="min-h-[120px] font-mono text-xs"
            aria-label="Showdown set text"
          />
          <Button
            type="button"
            size="sm"
            className="mt-2 w-full"
            disabled={!importText.trim() || isImporting}
            onClick={handleImport}
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
