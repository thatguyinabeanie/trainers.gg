"use client";

import { useState } from "react";
import { Copy, Ellipsis, Upload } from "lucide-react";
import { toast } from "sonner";

import { exportPokemonToShowdown, parsePokemon } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";
import { containsProfanity } from "@trainers/validators";

import { updatePokemonAction } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  /** Field-level updater (debounced in the parent workspace). */
  onUpdate: (field: string, value: unknown) => void;
  /** Called after a successful import so the parent can router.refresh(). */
  onImported?: () => void;
  disabled?: boolean;
}

type GenderValue = "Male" | "Female" | "Unknown";

// =============================================================================
// PokemonDetailsPopover
// =============================================================================

/**
 * The "more" menu in the editor header band — exposes per-Pokémon metadata
 * (nickname, gender, shiny, level) and per-mon import / export of the
 * Showdown set. Triggered by an Ellipsis icon button at the rightmost slot
 * of the header band.
 *
 * Why a popover (not a dialog): these fields are quick edits the user often
 * sets and forgets — a side-panel popover keeps them visible alongside the
 * main editor without taking over the screen.
 */
export function PokemonDetailsPopover({
  teamId,
  pokemon,
  onUpdate,
  onImported,
  disabled = false,
}: PokemonDetailsPopoverProps) {
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Field handlers — defer to onUpdate so the parent's debounced save fires.
  // ---------------------------------------------------------------------------

  function handleNicknameChange(value: string) {
    onUpdate("nickname", value || null);
  }

  function handleGenderChange(value: GenderValue) {
    // Database column is nullable: store null for Unknown so we don't persist
    // a sentinel string.
    onUpdate("gender", value === "Unknown" ? null : value);
  }

  function handleShinyChange(value: boolean) {
    onUpdate("is_shiny", value);
  }

  function handleLevelChange(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(1, Math.min(100, value));
    onUpdate("level", clamped);
  }

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
  // Derived values
  // ---------------------------------------------------------------------------

  const genderValue: GenderValue = pokemon.gender ?? "Unknown";

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
        {/* Nickname */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pokemon-nickname" className="text-xs">
            Nickname
          </Label>
          <Input
            id="pokemon-nickname"
            value={pokemon.nickname ?? ""}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder={pokemon.species || "Nickname"}
            className="h-8 text-sm"
            disabled={disabled}
            maxLength={18}
          />
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Gender</Label>
          <RadioGroup
            value={genderValue}
            onValueChange={(v) => handleGenderChange(v as GenderValue)}
            className="flex gap-3"
            disabled={disabled}
          >
            {(["Male", "Female", "Unknown"] as const).map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-1.5 text-xs"
              >
                <RadioGroupItem value={value} />
                {value}
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Shiny */}
        <div className="flex items-center justify-between">
          <Label htmlFor="pokemon-shiny" className="text-xs">
            Shiny
          </Label>
          <Switch
            id="pokemon-shiny"
            checked={pokemon.is_shiny ?? false}
            onCheckedChange={handleShinyChange}
            disabled={disabled}
          />
        </div>

        {/* Level */}
        <div className="flex items-center justify-between">
          <Label htmlFor="pokemon-level" className="text-xs">
            Level
          </Label>
          <Input
            id="pokemon-level"
            type="number"
            min={1}
            max={100}
            value={pokemon.level ?? 50}
            onChange={(e) =>
              handleLevelChange(parseInt(e.target.value || "50", 10))
            }
            className="h-8 w-20 text-right text-sm tabular-nums"
            disabled={disabled}
          />
        </div>

        <Separator />

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
