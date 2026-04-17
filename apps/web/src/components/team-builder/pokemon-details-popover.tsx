"use client";

import { useState } from "react";
import { Copy, Ellipsis, Upload } from "lucide-react";
import { toast } from "sonner";

import { exportPokemonToShowdown, parsePokemon } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";
import { containsProfanity } from "@trainers/validators";

import { updatePokemonAction } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { dbPokemonToFlat } from "./pokemon-utils";

// =============================================================================
// Types
// =============================================================================

interface PokemonDetailsPopoverProps {
  /** Team id — needed for the per-mon import flow that hits updatePokemonAction. */
  teamId: number;
  pokemon: Tables<"pokemon">;
  /** Called after a successful import so the parent can router.refresh(). */
  onImported?: () => void;
  disabled?: boolean;
}

// =============================================================================
// PokemonDetailsPopover
// =============================================================================

/**
 * The "⋯" menu in the editor header band. Scoped to Showdown set import /
 * export only — nickname, gender, shiny, and level are now inline controls in
 * the header band itself.
 *
 * Why a popover (not a dialog): import/export is a quick one-off action and a
 * side-panel keeps context visible alongside the main editor.
 */
export function PokemonDetailsPopover({
  teamId,
  pokemon,
  onImported,
  disabled = false,
}: PokemonDetailsPopoverProps) {
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Export — copy this slot's Showdown set to the clipboard.
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
      console.warn("[pokemon-details-popover] Export failed:", err);
      toast.error("Failed to copy — please copy manually.");
    }
  }

  // ---------------------------------------------------------------------------
  // Import — parse a Showdown set and write it to this slot.
  // Mirrors the validation rules from PokemonImportExport so the two flows
  // stay consistent (profanity check, default IVs, etc.).
  // ---------------------------------------------------------------------------

  async function handleImport() {
    const parsed = parsePokemon(importText.trim());
    if (!parsed) {
      toast.error("Could not parse that set. Check the format and try again.");
      return;
    }

    if (parsed.nickname && containsProfanity(parsed.nickname)) {
      toast.error(
        "Nickname contains inappropriate content. Remove profanity and try again."
      );
      return;
    }

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
        setImportOpen(false);
        onImported?.();
        toast.success("Set imported successfully");
      } else {
        toast.error(result.error ?? "Failed to import set");
      }
    } catch (err) {
      console.error("[pokemon-details-popover] Import failed:", err);
      toast.error("Failed to import set. Check your connection and try again.");
    } finally {
      setIsImporting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-8",
              disabled && "pointer-events-none opacity-50"
            )}
            aria-label="More Pokémon details"
            title="More details"
          />
        }
      >
        <Ellipsis className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="flex w-72 flex-col gap-3 p-3"
      >
        {/* Per-Pokémon import / export */}
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Showdown set
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 justify-start text-xs"
              onClick={handleExport}
              disabled={disabled}
            >
              <Copy className="size-3.5" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 justify-start text-xs"
              onClick={() => setImportOpen((o) => !o)}
              disabled={disabled}
            >
              <Upload className="size-3.5" />
              Import
            </Button>
          </div>
          {importOpen && (
            <div className="mt-1 flex flex-col gap-2">
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Pikachu @ Light Ball\nAbility: Static\n…"}
                className="min-h-[100px] font-mono text-xs"
                aria-label="Showdown set text"
                disabled={disabled || isImporting}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!importText.trim() || isImporting || disabled}
                onClick={handleImport}
              >
                {isImporting ? "Importing…" : "Apply import"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
