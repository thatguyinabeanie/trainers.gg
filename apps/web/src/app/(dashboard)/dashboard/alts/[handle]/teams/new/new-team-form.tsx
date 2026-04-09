"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { type GameFormat } from "@trainers/pokemon";
import { parseShowdownText } from "@trainers/validators";

import { type TablesInsert } from "@trainers/supabase";

import { createTeamAction, addPokemonToTeamAction } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Format pill selector
// ---------------------------------------------------------------------------

interface FormatSelectorProps {
  formats: GameFormat[];
  selected: string;
  onChange: (id: string) => void;
}

function FormatSelector({ formats, selected, onChange }: FormatSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((fmt) => (
        <button
          key={fmt.id}
          type="button"
          onClick={() => onChange(fmt.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            selected === fmt.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent border-border"
          )}
        >
          {fmt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New team form
// ---------------------------------------------------------------------------

interface NewTeamFormProps {
  altId: number;
  handle: string;
  activeFormats: GameFormat[];
  defaultFormat: string;
  /** Pre-select import mode when ?mode=import is set */
  initialMode: "empty" | "import";
}

/**
 * Client form for creating a new team.
 * Supports empty creation and Showdown paste import.
 */
export function NewTeamForm({
  altId,
  handle,
  activeFormats,
  defaultFormat,
  initialMode,
}: NewTeamFormProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"empty" | "import">(initialMode);
  const [name, setName] = useState("");
  const [format, setFormat] = useState(defaultFormat);
  const [paste, setPaste] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a team name.");
      return;
    }

    if (!format) {
      toast.error("Please select a format.");
      return;
    }

    startTransition(async () => {
      // 1. Create the team
      const result = await createTeamAction(altId, name.trim(), format);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const teamId = result.data.id;

      // 2. If import mode, parse the paste and add each Pokemon
      if (mode === "import" && paste.trim()) {
        const parsedTeam = parseShowdownText(paste.trim());

        if (parsedTeam.length === 0) {
          toast.warning(
            "Showdown paste could not be parsed. Team created empty."
          );
        } else {
          // Add each Pokemon sequentially at its position.
          // Cast gender to the DB enum — ParsedPokemon uses string | null but
          // the DB expects the "Male" | "Female" enum. Trim to valid values only.
          const addResults = await Promise.all(
            parsedTeam.map((pokemon, i) => {
              const gender =
                pokemon.gender === "Male" || pokemon.gender === "Female"
                  ? pokemon.gender
                  : null;
              const pokemonInsert: TablesInsert<"pokemon"> = {
                species: pokemon.species,
                ability: pokemon.ability,
                nature: pokemon.nature,
                move1: pokemon.move1 ?? "Tackle",
                move2: pokemon.move2,
                move3: pokemon.move3,
                move4: pokemon.move4,
                held_item: pokemon.held_item,
                level: pokemon.level,
                nickname: pokemon.nickname,
                is_shiny: pokemon.is_shiny,
                tera_type: pokemon.tera_type,
                gender,
                ev_hp: pokemon.ev_hp,
                ev_attack: pokemon.ev_attack,
                ev_defense: pokemon.ev_defense,
                ev_special_attack: pokemon.ev_special_attack,
                ev_special_defense: pokemon.ev_special_defense,
                ev_speed: pokemon.ev_speed,
                iv_hp: pokemon.iv_hp,
                iv_attack: pokemon.iv_attack,
                iv_defense: pokemon.iv_defense,
                iv_special_attack: pokemon.iv_special_attack,
                iv_special_defense: pokemon.iv_special_defense,
                iv_speed: pokemon.iv_speed,
              };
              return addPokemonToTeamAction(teamId, pokemonInsert, i + 1);
            })
          );

          const failures = addResults.filter((r) => !r.success);
          if (failures.length > 0) {
            toast.warning(
              `Team created, but ${failures.length} Pokémon failed to import.`
            );
          }
        }
      }

      toast.success("Team created!");
      router.push(`/dashboard/alts/${handle}/teams/${teamId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Team name */}
      <div className="grid gap-2">
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          placeholder="My team..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
          autoFocus
        />
      </div>

      {/* Format selector */}
      <div className="grid gap-2">
        <Label>Format</Label>
        {activeFormats.length > 0 ? (
          <FormatSelector
            formats={activeFormats}
            selected={format}
            onChange={setFormat}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            No active formats available.
          </p>
        )}
      </div>

      {/* Start from — empty vs import */}
      <div className="grid gap-2">
        <Label>Start from</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("empty")}
            disabled={isPending}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "empty"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border"
            )}
          >
            Empty team
          </button>
          <button
            type="button"
            onClick={() => setMode("import")}
            disabled={isPending}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "import"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border"
            )}
          >
            Import paste
          </button>
        </div>
      </div>

      {/* Showdown paste textarea */}
      {mode === "import" && (
        <div className="grid gap-2">
          <Label htmlFor="showdown-paste">Showdown Paste</Label>
          <Textarea
            id="showdown-paste"
            placeholder="Paste a Showdown export here..."
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={10}
            disabled={isPending}
            className="font-mono text-xs"
          />
          <p className="text-muted-foreground text-xs">
            Paste your team export from Pokemon Showdown. Up to 6 Pokémon will
            be imported.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === "import" ? "Import & Create Team" : "Create Team"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
