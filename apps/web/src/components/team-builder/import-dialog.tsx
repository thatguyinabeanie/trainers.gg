"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  parseShowdownText,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  validateTeamStructure,
  type ParsedPokemon,
  type ValidationError,
} from "@trainers/validators";
import { type TeamWithPokemon, type TablesInsert } from "@trainers/supabase";

import { addPokemonToTeamAction } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// =============================================================================
// Types
// =============================================================================

interface ImportDialogProps {
  team: TeamWithPokemon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** Build a `TablesInsert<"pokemon">` from a `ParsedPokemon`. */
function parsedToInsert(pokemon: ParsedPokemon): TablesInsert<"pokemon"> {
  const gender =
    pokemon.gender === "Male" || pokemon.gender === "Female"
      ? pokemon.gender
      : null;
  return {
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
}

// =============================================================================
// Preview component
// =============================================================================

interface PreviewPanelProps {
  parsed: ParsedPokemon[];
  availableSlots: number;
  structuralErrors: ValidationError[];
}

function PreviewPanel({
  parsed,
  availableSlots,
  structuralErrors,
}: PreviewPanelProps) {
  const willImport = parsed.slice(0, availableSlots);
  const willSkip = parsed.slice(availableSlots);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Previewing {parsed.length} Pokémon — {willImport.length} will be
        imported
        {willSkip.length > 0 ? ` (${willSkip.length} skipped, team full)` : ""}.
      </p>

      {/* Structural validation errors */}
      {structuralErrors.length > 0 && (
        <div className="bg-destructive/10 border-destructive/30 rounded-md border p-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <AlertTriangle className="text-destructive size-3.5 shrink-0" />
            <span className="text-destructive text-xs font-medium">
              {structuralErrors.length} issue
              {structuralErrors.length === 1 ? "" : "s"} found
            </span>
          </div>
          <ul className="text-destructive/80 flex flex-col gap-0.5 text-xs">
            {structuralErrors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Replace warning */}
      {availableSlots < 6 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
          This team already has {6 - availableSlots} Pokémon. New Pokémon will
          fill remaining slots.
        </p>
      )}

      {/* Species list */}
      <ul className="flex flex-col gap-1">
        {willImport.map((p, i) => (
          <li
            key={i}
            className="bg-muted flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm"
          >
            <span className="font-medium">{p.species}</span>
            <span className="text-muted-foreground text-xs">
              {[p.held_item, p.ability].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
        {willSkip.map((p, i) => (
          <li
            key={`skip-${i}`}
            className="text-muted-foreground flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm line-through opacity-50"
          >
            <span>{p.species}</span>
            <span className="text-xs">skipped</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// ImportDialog
// =============================================================================

/**
 * Sheet dialog for importing Pokémon into a team.
 *
 * Two tabs:
 * - Paste Text: paste raw Showdown export
 * - Pokepaste URL: enter a pokepast.es URL and fetch automatically
 *
 * Shows a preview of parsed Pokémon before confirming import.
 */
export function ImportDialog({
  team,
  open,
  onOpenChange,
  onImportComplete,
}: ImportDialogProps) {
  const [paste, setPaste] = useState("");
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedPokemon[] | null>(null);
  const [isFetching, startFetchTransition] = useTransition();
  const [isPendingImport, startImportTransition] = useTransition();

  const availableSlots = 6 - team.team_pokemon.length;
  const structuralErrors = parsed !== null ? validateTeamStructure(parsed) : [];
  const hasStructuralErrors = structuralErrors.length > 0;

  // ---------------------------------------------------------------------------
  // Reset state when sheet closes
  // ---------------------------------------------------------------------------

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPaste("");
      setUrl("");
      setParsed(null);
    }
    onOpenChange(next);
  }

  // ---------------------------------------------------------------------------
  // Parse paste text tab
  // ---------------------------------------------------------------------------

  function handleParsePaste() {
    const text = paste.trim();
    if (!text) {
      toast.error("Paste a Showdown export first.");
      return;
    }
    const result = parseShowdownText(text);
    if (result.length === 0) {
      toast.error(
        "Could not parse the Showdown paste. Check the format and try again."
      );
      return;
    }
    setParsed(result);
  }

  // ---------------------------------------------------------------------------
  // Fetch Pokepaste URL tab
  // ---------------------------------------------------------------------------

  function handleFetchUrl() {
    const input = url.trim();
    if (!input) {
      toast.error("Enter a Pokepaste URL first.");
      return;
    }

    const pokepaste = parsePokepaseUrl(input);
    if (!pokepaste) {
      toast.error(
        "Invalid Pokepaste URL. Must be a pokepast.es link (e.g. https://pokepast.es/abc1234567890abc)."
      );
      return;
    }

    startFetchTransition(async () => {
      const rawUrl = getPokepaseRawUrl(pokepaste.pasteId);
      let rawText: string;
      try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        rawText = await response.text();
      } catch (err) {
        // CORS or network failure — guide the user to paste manually
        const message =
          err instanceof TypeError && err.message === "Failed to fetch"
            ? "Could not fetch the Pokepaste (CORS blocked). Open the URL and paste the text manually instead."
            : `Failed to fetch Pokepaste: ${err instanceof Error ? err.message : "network error"}. Try pasting the text manually.`;
        toast.error(message);
        return;
      }

      const result = parseShowdownText(rawText.trim());
      if (result.length === 0) {
        toast.error(
          "Could not parse the Pokepaste content. The paste may be empty or malformed."
        );
        return;
      }
      setParsed(result);
    });
  }

  // ---------------------------------------------------------------------------
  // Import handler (shared across both tabs)
  // ---------------------------------------------------------------------------

  function handleImport() {
    if (!parsed || parsed.length === 0) return;

    if (availableSlots <= 0) {
      toast.error(
        "This team already has 6 Pokémon. Remove some before importing."
      );
      return;
    }

    startImportTransition(async () => {
      const toImport = parsed.slice(0, availableSlots);

      // Find available position slots (1–6) not already occupied.
      const usedPositions = new Set(
        team.team_pokemon.map((tp) => tp.team_position)
      );
      const availablePositions = [1, 2, 3, 4, 5, 6].filter(
        (p) => !usedPositions.has(p)
      );

      const addResults = await Promise.all(
        toImport.map((pokemon, i) =>
          addPokemonToTeamAction(
            team.id,
            parsedToInsert(pokemon),
            availablePositions[i] ?? i + 1
          )
        )
      );

      const failures = addResults.filter((r) => !r.success);
      if (failures.length > 0) {
        const failedSpecies = toImport
          .filter((_, i) => !addResults[i]?.success)
          .map((p) => p.species)
          .join(", ");
        toast.warning(`Imported with issues: ${failedSpecies} failed to add.`);
      } else {
        toast.success(`Imported ${toImport.length} Pokémon.`);
      }

      onImportComplete();
      handleOpenChange(false);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isWorking = isFetching || isPendingImport;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import Pokémon</SheetTitle>
          <SheetDescription>
            Add Pokémon to this team from a Showdown paste or Pokepaste URL. Up
            to {availableSlots} slot{availableSlots === 1 ? "" : "s"} available.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-4">
          {parsed ? (
            // Preview mode
            <>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <PreviewPanel
                parsed={parsed}
                availableSlots={availableSlots}
                structuralErrors={structuralErrors}
              />
            </>
          ) : (
            // Input mode — tabbed
            <Tabs defaultValue="paste" className="flex flex-1 flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1">
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1">
                  Pokepaste URL
                </TabsTrigger>
              </TabsList>

              {/* Paste Text tab */}
              <TabsContent value="paste" className="flex flex-col gap-3 pt-1">
                <Label htmlFor="import-paste">Showdown Paste</Label>
                <Textarea
                  id="import-paste"
                  placeholder="Paste your Showdown export here..."
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={14}
                  disabled={isWorking}
                  className="font-mono text-xs"
                />
                <Button
                  onClick={handleParsePaste}
                  disabled={isWorking || !paste.trim()}
                  variant="outline"
                  size="sm"
                >
                  Preview Team
                </Button>
              </TabsContent>

              {/* Pokepaste URL tab */}
              <TabsContent value="url" className="flex flex-col gap-3 pt-1">
                <Label htmlFor="import-url">Pokepaste URL</Label>
                <Input
                  id="import-url"
                  type="url"
                  placeholder="https://pokepast.es/abc1234567890abc"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isWorking}
                />
                <p className="text-muted-foreground text-xs">
                  Enter a pokepast.es link. The team will be fetched and
                  previewed before importing.
                </p>
                <Button
                  onClick={handleFetchUrl}
                  disabled={isWorking || !url.trim()}
                  variant="outline"
                  size="sm"
                >
                  {isFetching && <Loader2 className="size-4 animate-spin" />}
                  Fetch &amp; Preview
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          {parsed ? (
            <Button
              onClick={handleImport}
              disabled={isWorking || availableSlots <= 0 || hasStructuralErrors}
            >
              {isPendingImport && <Loader2 className="size-4 animate-spin" />}
              Import {Math.min(parsed.length, availableSlots)} Pokémon
            </Button>
          ) : null}
          {parsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParsed(null)}
              disabled={isWorking}
              className="order-first mr-auto"
            >
              Back
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
