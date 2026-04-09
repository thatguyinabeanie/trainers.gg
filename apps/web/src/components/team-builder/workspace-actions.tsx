"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Download,
  GitFork,
  CheckCircle2,
  Loader2,
  Copy,
} from "lucide-react";

import { exportTeamToShowdown } from "@trainers/pokemon";
import { parseShowdownText } from "@trainers/validators";
import { type TeamWithPokemon, type TablesInsert } from "@trainers/supabase";

import { forkTeamAction, addPokemonToTeamAction } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// =============================================================================
// Types
// =============================================================================

interface WorkspaceActionsProps {
  team: TeamWithPokemon;
  altId: number;
  handle: string;
}

// =============================================================================
// WorkspaceActions
// =============================================================================

/**
 * Action buttons for the team workspace header:
 * - Import — opens a sheet with Showdown paste textarea
 * - Export — dropdown with "Copy as Showdown text"
 * - Fork — duplicates this team and navigates to the new copy
 * - Validate — placeholder for legality validation (Task N+)
 */
export function WorkspaceActions({
  team,
  altId,
  handle,
}: WorkspaceActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [isPendingImport, startImportTransition] = useTransition();
  const [isPendingFork, startForkTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  function handleImport() {
    if (!paste.trim()) {
      toast.error("Paste a Showdown export first.");
      return;
    }

    startImportTransition(async () => {
      const parsedTeam = parseShowdownText(paste.trim());

      if (parsedTeam.length === 0) {
        toast.error(
          "Could not parse the Showdown paste. Check the format and try again."
        );
        return;
      }

      const currentCount = team.team_pokemon.length;
      const availableSlots = 6 - currentCount;

      if (availableSlots <= 0) {
        toast.error(
          "This team already has 6 Pokémon. Remove some before importing."
        );
        return;
      }

      const toImport = parsedTeam.slice(0, availableSlots);

      const addResults = await Promise.all(
        toImport.map((pokemon, i) => {
          // ParsedPokemon uses snake_case field names (matches DB columns)
          const gender =
            pokemon.gender === "Male" || pokemon.gender === "Female"
              ? pokemon.gender
              : null;
          const pokemonInsert: TablesInsert<"pokemon"> = {
            species: pokemon.species,
            ability: pokemon.ability ?? "",
            nature: pokemon.nature ?? "",
            move1: pokemon.move1 ?? "Tackle",
            move2: pokemon.move2,
            move3: pokemon.move3,
            move4: pokemon.move4,
            held_item: pokemon.held_item,
            level: pokemon.level ?? 50,
            nickname: pokemon.nickname,
            is_shiny: pokemon.is_shiny ?? false,
            tera_type: pokemon.tera_type,
            gender,
            ev_hp: pokemon.ev_hp ?? 0,
            ev_attack: pokemon.ev_attack ?? 0,
            ev_defense: pokemon.ev_defense ?? 0,
            ev_special_attack: pokemon.ev_special_attack ?? 0,
            ev_special_defense: pokemon.ev_special_defense ?? 0,
            ev_speed: pokemon.ev_speed ?? 0,
            iv_hp: pokemon.iv_hp ?? 31,
            iv_attack: pokemon.iv_attack ?? 31,
            iv_defense: pokemon.iv_defense ?? 31,
            iv_special_attack: pokemon.iv_special_attack ?? 31,
            iv_special_defense: pokemon.iv_special_defense ?? 31,
            iv_speed: pokemon.iv_speed ?? 31,
          };
          return addPokemonToTeamAction(
            team.id,
            pokemonInsert,
            currentCount + i + 1
          );
        })
      );

      const failures = addResults.filter((r) => !r.success);
      if (failures.length > 0) {
        toast.warning(
          `Imported with issues: ${failures.length} Pokémon failed.`
        );
      } else {
        toast.success(`Imported ${toImport.length} Pokémon.`);
      }

      setPaste("");
      setImportOpen(false);
      router.refresh();
    });
  }

  // ---------------------------------------------------------------------------
  // Export handler
  // ---------------------------------------------------------------------------

  function handleExportShowdown() {
    // Build PokemonSetFlat (camelCase) from DB rows (snake_case)
    const sortedPokemon = [...team.team_pokemon]
      .sort((a, b) => a.team_position - b.team_position)
      .flatMap((tp) => {
        if (!tp.pokemon) return [];
        const p = tp.pokemon;
        return [
          {
            species: p.species ?? "",
            nickname: p.nickname ?? undefined,
            ability: p.ability ?? "",
            nature: p.nature ?? "",
            move1: p.move1 ?? "",
            move2: p.move2 ?? undefined,
            move3: p.move3 ?? undefined,
            move4: p.move4 ?? undefined,
            heldItem: p.held_item ?? undefined,
            level: p.level ?? 50,
            isShiny: p.is_shiny ?? false,
            teraType: p.tera_type ?? undefined,
            gender: (p.gender as "Male" | "Female" | undefined) ?? undefined,
            formatLegal: true,
            evHp: p.ev_hp ?? 0,
            evAttack: p.ev_attack ?? 0,
            evDefense: p.ev_defense ?? 0,
            evSpecialAttack: p.ev_special_attack ?? 0,
            evSpecialDefense: p.ev_special_defense ?? 0,
            evSpeed: p.ev_speed ?? 0,
            ivHp: p.iv_hp ?? 31,
            ivAttack: p.iv_attack ?? 31,
            ivDefense: p.iv_defense ?? 31,
            ivSpecialAttack: p.iv_special_attack ?? 31,
            ivSpecialDefense: p.iv_special_defense ?? 31,
            ivSpeed: p.iv_speed ?? 31,
          },
        ];
      });

    const showdownText = exportTeamToShowdown(sortedPokemon);
    navigator.clipboard
      .writeText(showdownText)
      .then(() => toast.success("Copied to clipboard!"))
      .catch(() => toast.error("Failed to copy — please copy manually."));
  }

  // ---------------------------------------------------------------------------
  // Fork handler
  // ---------------------------------------------------------------------------

  function handleFork() {
    startForkTransition(async () => {
      const result = await forkTeamAction(team.id, altId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Team forked!");
      router.push(`/dashboard/alts/${handle}/teams/${result.data.id}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center gap-2">
      {/* Import */}
      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
          <Upload className="size-4" />
          Import
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Import Pokémon</SheetTitle>
            <SheetDescription>
              Paste a Showdown export to add Pokémon to this team. Up to{" "}
              {6 - team.team_pokemon.length} slot
              {6 - team.team_pokemon.length === 1 ? "" : "s"} available.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4">
            <Label htmlFor="import-paste">Showdown Paste</Label>
            <Textarea
              id="import-paste"
              placeholder="Paste your Showdown export here..."
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={14}
              disabled={isPendingImport}
              className="font-mono text-xs"
            />
          </div>

          <SheetFooter>
            <SheetClose
              render={<Button variant="outline" disabled={isPendingImport} />}
            >
              Cancel
            </SheetClose>
            <Button onClick={handleImport} disabled={isPendingImport}>
              {isPendingImport && <Loader2 className="size-4 animate-spin" />}
              Import
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          <Download className="size-4" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportShowdown}>
            <Copy className="size-4" />
            Copy as Showdown text
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Fork */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleFork}
        disabled={isPendingFork}
      >
        {isPendingFork ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GitFork className="size-4" />
        )}
        Fork
      </Button>

      {/* Validate — placeholder for Task N+ */}
      <Button variant="outline" size="sm" disabled>
        <CheckCircle2 className="size-4" />
        Validate
      </Button>
    </div>
  );
}
