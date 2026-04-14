"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, CheckCircle2, Import, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  type GameFormat,
  buildSpeciesSearchIndex,
  getValidAbilities,
} from "@trainers/pokemon";
import { type TeamWithPokemon, type TablesInsert } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addPokemonToTeamAction, updatePokemonAction } from "@/actions/teams";
import { ImportDialog } from "@/components/team-builder/import-dialog";
import { ContextPanel } from "@/components/team-builder/context-panel";
import { PokemonEditor } from "@/components/team-builder/pokemon-editor";
import { TeamSidebar } from "@/components/team-builder/team-sidebar";

import { SpeciesPicker } from "./species-picker";
import { useTeamValidation } from "./validation-hooks";

// =============================================================================
// Types
// =============================================================================

interface TeamWorkspaceProps {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
}

// =============================================================================
// TeamWorkspace
// =============================================================================

/**
 * Client component that orchestrates the team editor workspace.
 * Manages selected pokemon state and composes the team sidebar,
 * editor panel, and context panel.
 *
 * Layout:
 *   - Team sidebar on the far left (64px, 6 pokemon slots stacked vertically)
 *   - Editor panel (left 50%) and context panel (right 50%) side-by-side
 *   - When picker is open: species picker replaces the split panel
 */
export function TeamWorkspace({ team, format }: TeamWorkspaceProps) {
  // Sort pokemon by position and get the first one as default selection
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(
    sortedPokemon[0]?.pokemon_id ?? null
  );
  const [activeTab, setActiveTab] = useState<"types" | "speed" | "calc">(
    "types"
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{
    pokemonId: number;
    field: string;
    value: unknown;
  } | null>(null);

  // Import dialog state (for empty-state shortcut)
  const [importOpen, setImportOpen] = useState(false);

  // Context panel visibility + resizable width
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidthPercent, setPanelWidthPercent] = useState(50);

  // Species picker state
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    slot: number | null;
    mode: "add" | "change";
  }>({ open: false, slot: null, mode: "add" });

  // Validation panel toggle state
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);

  // Validation
  const {
    errors: validationErrors,
    pokemonErrors,
    validate,
  } = useTeamValidation(team.team_pokemon, format);

  // Derived error/warning counts for the Validate button badge
  const errorCount = validationErrors.filter(
    (e) => e.severity === "error"
  ).length;

  // Handle Validate button click — run immediately and toggle panel
  function handleValidate() {
    validate();
    setValidationPanelOpen((prev) => !prev);
  }

  // Build species search index for the format (derived value — React Compiler handles memoization)
  const speciesIndex = buildSpeciesSearchIndex(format?.id ?? "gen9vgc2026regi");

  // Clear both debounce timers on unmount to prevent setState on an unmounted component.
  // If there is a pending save, fire it immediately — the server action will still execute
  // even though we don't await it (the component is unmounting).
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedIdleTimerRef.current) clearTimeout(savedIdleTimerRef.current);
      if (pendingUpdateRef.current) {
        const { pokemonId, field, value } = pendingUpdateRef.current;
        updatePokemonAction(team.id, pokemonId, {
          [field]: value,
        } as Parameters<typeof updatePokemonAction>[2]).catch((err) => {
          console.error(
            "[team-workspace] Failed to flush pending save on unmount:",
            err
          );
        });
      }
    };
  }, []);

  const selectedEntry = sortedPokemon.find(
    (tp) => tp.pokemon_id === selectedPokemonId
  );
  const hasPokemon = sortedPokemon.length > 0;

  // ---------------------------------------------------------------------------
  // Auto-save handler — debounced 2s
  // ---------------------------------------------------------------------------

  function handlePokemonUpdate(
    pokemonId: number,
    field: string,
    value: unknown
  ) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedIdleTimerRef.current) clearTimeout(savedIdleTimerRef.current);
    setSaveStatus("saving");
    // Track the latest pending update so it can be flushed on unmount
    pendingUpdateRef.current = { pokemonId, field, value };
    saveTimerRef.current = setTimeout(async () => {
      // Clear before awaiting so unmount cleanup won't re-fire an in-flight save
      pendingUpdateRef.current = null;
      const result = await updatePokemonAction(team.id, pokemonId, {
        [field]: value,
      } as Parameters<typeof updatePokemonAction>[2]);
      if (result.success) {
        setSaveStatus("saved");
        savedIdleTimerRef.current = setTimeout(
          () => setSaveStatus("idle"),
          2000
        );
      } else {
        setSaveStatus("error");
        toast.error(result.error ?? "Failed to save changes.");
      }
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Species picker handlers
  // ---------------------------------------------------------------------------

  function handleAddNew() {
    const nextSlot = sortedPokemon.length;
    setPickerState({ open: true, slot: nextSlot, mode: "add" });
  }

  function handleSpeciesClick() {
    const slotIndex = sortedPokemon.findIndex(
      (tp) => tp.pokemon_id === selectedPokemonId
    );
    setPickerState({ open: true, slot: slotIndex, mode: "change" });
  }

  function handleSpeciesSelect(
    species: string,
    selectMode: "defaults" | "blank"
  ) {
    if (pickerState.mode === "add") {
      const firstAbility =
        selectMode === "defaults" ? (getValidAbilities(species)[0] ?? "") : "";
      const pokemon: TablesInsert<"pokemon"> = {
        species,
        ability: firstAbility,
        nature: selectMode === "defaults" ? "Hardy" : "",
        move1: "",
        level: 50,
        ev_hp: 0,
        ev_attack: 0,
        ev_defense: 0,
        ev_special_attack: 0,
        ev_special_defense: 0,
        ev_speed: 0,
        iv_hp: 31,
        iv_attack: 31,
        iv_defense: 31,
        iv_special_attack: 31,
        iv_special_defense: 31,
        iv_speed: 31,
        is_shiny: false,
      };

      const usedPositions = new Set(
        sortedPokemon.map((tp) => tp.team_position)
      );
      const position =
        [1, 2, 3, 4, 5, 6].find((p) => !usedPositions.has(p)) ?? 1;

      startTransition(async () => {
        const result = await addPokemonToTeamAction(team.id, pokemon, position);
        if (result.success) {
          setPickerState({ open: false, slot: null, mode: "add" });
          setSelectedPokemonId(result.data.pokemonId);
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to add Pokémon.");
        }
      });
    } else {
      // change mode — update existing pokemon's species
      const pokemonId = selectedPokemonId;
      if (!pokemonId) return;

      const firstAbility =
        selectMode === "defaults" ? (getValidAbilities(species)[0] ?? "") : "";

      startTransition(async () => {
        const result = await updatePokemonAction(team.id, pokemonId, {
          species,
          ability: firstAbility,
          nature: selectMode === "defaults" ? "Hardy" : "",
          move1: "",
          move2: null,
          move3: null,
          move4: null,
          ev_hp: 0,
          ev_attack: 0,
          ev_defense: 0,
          ev_special_attack: 0,
          ev_special_defense: 0,
          ev_speed: 0,
        });
        if (result.success) {
          setPickerState({ open: false, slot: null, mode: "add" });
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to update species.");
        }
      });
    }
  }

  function handlePickerCancel() {
    setPickerState({ open: false, slot: null, mode: "add" });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Toolbar — Validate button + save status indicator */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-2 md:top-2">
        {/* Save status */}
        {saveStatus === "saving" && (
          <span className="text-muted-foreground animate-pulse text-xs">
            Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-muted-foreground text-xs">Saved</span>
        )}

        {/* Validate button */}
        <Button
          variant={validationPanelOpen ? "secondary" : "outline"}
          size="sm"
          onClick={handleValidate}
        >
          <CheckCircle2 className="size-4" />
          Validate
          {errorCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
              {errorCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Team sidebar — always visible so "+" button works even with 0 pokemon */}
      <TeamSidebar
        teamId={team.id}
        pokemon={team.team_pokemon}
        selectedPokemonId={selectedPokemonId}
        onSelect={setSelectedPokemonId}
        onAddNew={handleAddNew}
        choosingSlot={
          pickerState.open ? (pickerState.slot ?? undefined) : undefined
        }
        pokemonErrors={pokemonErrors}
      />

      {/* Main content area — species picker or split panel */}
      {pickerState.open ? (
        <SpeciesPicker
          speciesIndex={speciesIndex}
          currentTeam={sortedPokemon
            .filter((tp) => tp.pokemon !== null)
            .map((tp) => ({ species: tp.pokemon!.species ?? "" }))}
          currentSpecies={
            pickerState.mode === "change"
              ? (selectedEntry?.pokemon?.species ?? null)
              : null
          }
          onSelect={handleSpeciesSelect}
          onCancel={handlePickerCancel}
        />
      ) : !hasPokemon ? (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No Pokémon yet</p>
            <p className="mt-1 text-sm">
              Import a Showdown paste or add Pokémon one by one to get started.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Import className="size-4" />
            Import Paste
          </Button>
          <ImportDialog
            team={team}
            open={importOpen}
            onOpenChange={setImportOpen}
            onImportComplete={() => {
              router.refresh();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Editor panel — flex-1 when panel is open, full width when closed */}
          <div className="flex max-h-full flex-1 flex-col overflow-y-auto border-r">
            {selectedEntry?.pokemon ? (
              <PokemonEditor
                key={selectedEntry.pokemon.id}
                teamId={team.id}
                pokemon={selectedEntry.pokemon}
                format={format}
                teamPokemon={team.team_pokemon}
                onUpdate={(field, value) =>
                  handlePokemonUpdate(selectedEntry.pokemon!.id, field, value)
                }
                onSpeciesClick={handleSpeciesClick}
                onImport={() => router.refresh()}
                fieldErrors={
                  selectedPokemonId
                    ? (pokemonErrors.get(selectedPokemonId) ?? [])
                    : []
                }
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  Select a Pokémon to edit
                </p>
              </div>
            )}
          </div>

          {panelOpen ? (
            <>
              {/* Resize handle */}
              <div
                className="hover:bg-primary/20 flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const container = e.currentTarget.parentElement;
                  if (!container) return;
                  const startX = e.clientX;
                  const startWidth = panelWidthPercent;
                  const containerWidth =
                    container.getBoundingClientRect().width;

                  function onMove(moveEvent: PointerEvent) {
                    const delta = startX - moveEvent.clientX;
                    const deltaPercent = (delta / containerWidth) * 100;
                    const newWidth = Math.min(
                      75,
                      Math.max(25, startWidth + deltaPercent)
                    );
                    setPanelWidthPercent(newWidth);
                  }

                  function onUp() {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onUp);
                  }

                  document.addEventListener("pointermove", onMove);
                  document.addEventListener("pointerup", onUp);
                }}
              >
                {/* Drag dots */}
                <div className="flex flex-col gap-0.5">
                  <span className="bg-muted-foreground/30 block h-0.5 w-0.5 rounded-full" />
                  <span className="bg-muted-foreground/30 block h-0.5 w-0.5 rounded-full" />
                  <span className="bg-muted-foreground/30 block h-0.5 w-0.5 rounded-full" />
                </div>
              </div>

              {/* Context panel */}
              <div
                className="flex min-h-0 flex-shrink-0 flex-col overflow-hidden"
                style={{ width: `${panelWidthPercent}%` }}
              >
                <ContextPanel
                  team={team}
                  selectedPokemon={selectedEntry?.pokemon ?? null}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onClose={() => setPanelOpen(false)}
                  format={format}
                />
              </div>
            </>
          ) : (
            /* Icon rail — shown when panel is closed */
            <div className="flex w-9 flex-shrink-0 flex-col items-center gap-1 border-l pt-2">
              <button
                type="button"
                title="Type Coverage"
                aria-label="Open type coverage"
                onClick={() => {
                  setActiveTab("types");
                  setPanelOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded text-xs font-semibold transition-colors"
              >
                T
              </button>
              <button
                type="button"
                title="Speed Tiers"
                aria-label="Open speed tiers"
                onClick={() => {
                  setActiveTab("speed");
                  setPanelOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
              >
                <Zap className="size-3.5" />
              </button>
              <button
                type="button"
                title="Damage Calc"
                aria-label="Open damage calc"
                onClick={() => {
                  setActiveTab("calc");
                  setPanelOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
              >
                <Calculator className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending overlay while adding/changing species */}
      {isPending && (
        <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Saving...</p>
        </div>
      )}
    </div>
  );
}
