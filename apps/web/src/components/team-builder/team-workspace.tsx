"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, ChevronDown, Star, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  type GameFormat,
  buildSpeciesSearchIndex,
  getSpeciesTypes,
  getValidAbilities,
} from "@trainers/pokemon";
import {
  type TeamWithPokemon,
  type Tables,
  type TablesInsert,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { addPokemonToTeamAction, updatePokemonAction } from "@/actions/teams";
import { ContextPanel } from "@/components/team-builder/context-panel";
import { PokemonEditor } from "@/components/team-builder/pokemon-editor";
import { TeamSidebar } from "@/components/team-builder/team-sidebar";

import { PokemonImportExport } from "./pokemon-import-export";
import { SpeciesPicker } from "./species-picker";
import { TYPE_PILL_COLORS } from "./type-colors";
import { type ValidationError, useTeamValidation } from "./validation-hooks";

// =============================================================================
// Constants
// =============================================================================

/**
 * Synthetic placeholder used when a team has 0 Pokémon.
 * Passed to PokemonEditor with disabled=true so the full layout renders
 * but all pickers / inputs are no-ops.
 * id: -1 is a sentinel — this object is never persisted.
 */
const PLACEHOLDER_POKEMON: Tables<"pokemon"> = {
  id: -1,
  species: "",
  ability: "",
  held_item: null,
  nature: "Hardy",
  tera_type: null,
  nickname: null,
  gender: null,
  is_shiny: null,
  level: null,
  move1: "",
  move2: null,
  move3: null,
  move4: null,
  ev_hp: null,
  ev_attack: null,
  ev_defense: null,
  ev_special_attack: null,
  ev_special_defense: null,
  ev_speed: null,
  iv_hp: null,
  iv_attack: null,
  iv_defense: null,
  iv_special_attack: null,
  iv_special_defense: null,
  iv_speed: null,
  notes: null,
  format_legal: null,
  created_at: null,
};

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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{
    pokemonId: number;
    field: string;
    value: unknown;
  } | null>(null);

  // Context panel visibility + resizable width
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidthPercent, setPanelWidthPercent] = useState(50);

  // Species picker state
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    slot: number | null;
    mode: "add" | "change";
  }>({ open: false, slot: null, mode: "add" });

  // Validation
  const { pokemonErrors } = useTeamValidation(team.team_pokemon, format);

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
  // True when the team has no pokemon — drives placeholder vs real editor mode
  const isPlaceholder = sortedPokemon.length === 0;

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
    // Track the latest pending update so it can be flushed on unmount
    pendingUpdateRef.current = { pokemonId, field, value };
    saveTimerRef.current = setTimeout(async () => {
      // Clear before awaiting so unmount cleanup won't re-fire an in-flight save
      pendingUpdateRef.current = null;
      const result = await updatePokemonAction(team.id, pokemonId, {
        [field]: value,
      } as Parameters<typeof updatePokemonAction>[2]);
      if (!result.success) {
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
  // Species header helpers — field error lookup + inline error rendering
  // ---------------------------------------------------------------------------

  const selectedFieldErrors: ValidationError[] = selectedPokemonId
    ? (pokemonErrors.get(selectedPokemonId) ?? [])
    : [];

  function getSelectedFieldError(field: string): ValidationError | undefined {
    return selectedFieldErrors.find((e) => e.field === field);
  }

  function renderSelectedFieldError(...fields: string[]): React.ReactNode {
    const error = fields.reduce<ValidationError | undefined>(
      (found, f) => found ?? getSelectedFieldError(f),
      undefined
    );
    if (!error) return null;
    return (
      <p
        className={cn(
          "mt-0.5 text-xs",
          error.severity === "warning"
            ? "text-amber-600 dark:text-amber-500"
            : "text-destructive"
        )}
      >
        {error.message}
      </p>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* ===================================================================
              Species header — spans full width above the editor/panel split.
              Placeholder mode: shows "Choose a Pokémon" that opens the picker.
              Real mode: shows species name, type pills, nickname, gender, shiny,
              level, and import/export controls.
              =================================================================== */}
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
            {isPlaceholder ? (
              /* Placeholder header — opens the species picker at slot 0 */
              <button
                type="button"
                onClick={handleAddNew}
                aria-label="Choose a Pokémon"
                className={cn(
                  "flex items-center gap-1 text-base font-bold",
                  "text-muted-foreground hover:text-primary transition-colors"
                )}
              >
                Choose a Pokémon
                <ChevronDown className="size-3.5" />
              </button>
            ) : selectedEntry?.pokemon ? (
              <>
                {/* Species name — clickable to open species picker */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={handleSpeciesClick}
                    className={cn(
                      "flex items-center gap-1 text-base font-bold",
                      "hover:text-primary transition-colors"
                    )}
                  >
                    {selectedEntry.pokemon.species}
                    <ChevronDown className="text-muted-foreground size-3.5" />
                  </button>
                  {renderSelectedFieldError("species")}
                </div>

                {/* Type pills */}
                <div className="flex gap-1">
                  {getSpeciesTypes(selectedEntry.pokemon.species).map(
                    (type) => (
                      <span
                        key={type}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                          TYPE_PILL_COLORS[type] ?? "bg-muted text-foreground"
                        )}
                      >
                        {type}
                      </span>
                    )
                  )}
                </div>

                {/* Separator */}
                <span className="text-muted-foreground text-xs">·</span>

                {/* Nickname input */}
                <div className="flex flex-col">
                  <Input
                    placeholder="Nickname"
                    value={selectedEntry.pokemon.nickname ?? ""}
                    onChange={(e) =>
                      handlePokemonUpdate(
                        selectedEntry.pokemon!.id,
                        "nickname",
                        e.target.value || null
                      )
                    }
                    className={cn(
                      "h-6 w-28 px-2 text-xs",
                      getSelectedFieldError("nickname") && "border-destructive"
                    )}
                    aria-label="Pokemon nickname"
                  />
                  {renderSelectedFieldError("nickname")}
                </div>

                {/* Gender selector — only when species has gender differences */}
                {selectedEntry.pokemon.gender !== null ? (
                  <div className="flex flex-col items-start">
                    <div
                      className={cn(
                        "flex gap-0.5 rounded border p-0.5",
                        getSelectedFieldError("gender") && "border-destructive"
                      )}
                    >
                      {(["Male", "Female"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            handlePokemonUpdate(
                              selectedEntry.pokemon!.id,
                              "gender",
                              g
                            )
                          }
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                            selectedEntry.pokemon!.gender === g
                              ? g === "Male"
                                ? "bg-blue-500 text-white"
                                : "bg-pink-500 text-white"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {g === "Male" ? "♂" : "♀"}
                        </button>
                      ))}
                    </div>
                    {renderSelectedFieldError("gender")}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Genderless
                  </span>
                )}

                {/* Shiny toggle */}
                <button
                  type="button"
                  onClick={() =>
                    handlePokemonUpdate(
                      selectedEntry.pokemon!.id,
                      "is_shiny",
                      !(selectedEntry.pokemon!.is_shiny ?? false)
                    )
                  }
                  aria-label="Toggle shiny"
                  aria-pressed={selectedEntry.pokemon.is_shiny ?? false}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
                    selectedEntry.pokemon.is_shiny
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Star
                    className={cn(
                      "size-3",
                      selectedEntry.pokemon.is_shiny &&
                        "fill-yellow-500 text-yellow-500"
                    )}
                  />
                  {selectedEntry.pokemon.is_shiny ? "Shiny" : ""}
                </button>

                {/* Level input + import/export — pushed to far right */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">Lv</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={selectedEntry.pokemon.level ?? 50}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10);
                      if (!isNaN(raw)) {
                        handlePokemonUpdate(
                          selectedEntry.pokemon!.id,
                          "level",
                          Math.max(1, Math.min(100, raw))
                        );
                      }
                    }}
                    className="h-6 w-12 px-1 text-center text-xs"
                    aria-label="Pokemon level"
                  />
                  <PokemonImportExport
                    teamId={team.id}
                    pokemon={selectedEntry.pokemon}
                    onUpdate={() => router.refresh()}
                  />
                </div>
              </>
            ) : null}
          </div>

          {/* Editor + context panel — flex-row, fills remaining height */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Editor panel — scrolls independently */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-r">
              {isPlaceholder ? (
                /* Placeholder shell — disabled so all pickers are no-ops */
                <PokemonEditor
                  key="placeholder"
                  pokemon={PLACEHOLDER_POKEMON}
                  format={format}
                  teamPokemon={[]}
                  onUpdate={() => {
                    /* no-op: disabled placeholder */
                  }}
                  fieldErrors={[]}
                  disabled={true}
                />
              ) : selectedEntry?.pokemon ? (
                <PokemonEditor
                  key={selectedEntry.pokemon.id}
                  pokemon={selectedEntry.pokemon}
                  format={format}
                  teamPokemon={team.team_pokemon}
                  onUpdate={(field, value) =>
                    handlePokemonUpdate(selectedEntry.pokemon!.id, field, value)
                  }
                  fieldErrors={selectedFieldErrors}
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
