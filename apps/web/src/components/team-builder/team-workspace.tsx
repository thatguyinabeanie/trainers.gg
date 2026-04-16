"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  type GameFormat,
  buildSpeciesSearchIndex,
  getFormatById,
  getValidAbilities,
} from "@trainers/pokemon";
import {
  type TeamWithPokemon,
  type Tables,
  type TablesInsert,
} from "@trainers/supabase";

import { addPokemonToTeamAction, updatePokemonAction } from "@/actions/teams";
import { AnalyticsRail } from "@/components/team-builder/analytics-rail";
import { PokemonEditor } from "@/components/team-builder/pokemon-editor";
import { TeamStrip } from "@/components/team-builder/team-strip";
import { TypeChartPanel } from "@/components/team-builder/type-chart-panel";

import { SpeciesPicker } from "./species-picker";
import { useTeamValidation } from "./validation-hooks";

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

// PokemonEditor renders its own card chrome (`bg-card overflow-hidden
// rounded-lg shadow-sm`) so it can be used standalone. In the new 3-column
// layout, the center grid cell wraps both TeamStrip and PokemonEditor in a
// single shared card. We pass these neutralizing utility classes to strip the
// editor's duplicate chrome — same pattern as `PANEL_CHROME_OVERRIDE` in
// `analytics-rail.tsx`.
const EDITOR_CHROME_OVERRIDE =
  "bg-transparent shadow-none rounded-none overflow-visible";

// Default format used as a fallback when the team has no format set on it.
// The same id is used as the species index fallback below — keeping a single
// constant ensures the species picker, type chart, and Speed/Calc panels all
// agree on which format they're operating in when no team format is selected.
const DEFAULT_FORMAT_ID = "gen9vgc2026regi";

// Module-level cache — buildSpeciesSearchIndex iterates all species (~1,200+),
// so we cache per format ID to avoid re-computing on every render.
const speciesIndexCache = new Map<
  string,
  ReturnType<typeof buildSpeciesSearchIndex>
>();

function getCachedSpeciesIndex(formatId: string) {
  let index = speciesIndexCache.get(formatId);
  if (!index) {
    index = buildSpeciesSearchIndex(formatId);
    speciesIndexCache.set(formatId, index);
  }
  return index;
}

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
 * Manages selected pokemon state and composes the type chart, editor card
 * (team strip + pokemon editor), and analytics rail.
 *
 * Layout — fixed 3-column grid sized to a 1440px sweet spot:
 *   - LEFT (240px): TypeChartPanel — defensive coverage table
 *   - CENTER (1fr): Editor card — TeamStrip on top, PokemonEditor below
 *   - RIGHT (460px): AnalyticsRail — Speed / Calc tabs
 *
 * Species picker overlay: when open, replaces the center column only so the
 * left type chart and right analytics rail stay visible for cross-reference.
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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{
    pokemonId: number;
    field: string;
    value: unknown;
  } | null>(null);

  // Species picker state
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    slot: number | null;
    mode: "add" | "change";
  }>({ open: false, slot: null, mode: "add" });

  // Validation
  const { pokemonErrors } = useTeamValidation(team.team_pokemon, format);

  // Resolve the active format with a default fallback so downstream panels
  // (SpeedPanel, CalcPanel, type chart filters) always have a format to drive
  // their calculations off — otherwise SpeedPanel renders the
  // "Speed tiers require a known format" empty state for any team that hasn't
  // had a format set on the row.
  const resolvedFormat: GameFormat | undefined =
    format ?? getFormatById(DEFAULT_FORMAT_ID);

  const speciesIndex = getCachedSpeciesIndex(format?.id ?? DEFAULT_FORMAT_ID);

  // Clear the debounce timer on unmount to prevent setState on an unmounted
  // component. If there is a pending save, fire it immediately — the server
  // action will still execute even though we don't await it (the component is
  // unmounting).
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
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

  const selectedFieldErrors = selectedPokemonId
    ? (pokemonErrors.get(selectedPokemonId) ?? [])
    : [];

  // ---------------------------------------------------------------------------
  // Auto-save handler — debounced 2s
  // ---------------------------------------------------------------------------

  function handlePokemonUpdate(
    pokemonId: number,
    field: string,
    value: unknown
  ) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
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

  // Pre-compute the team's pokemon list (for TypeChartPanel) — filter out null
  // entries that exist when a slot is allocated but species not yet picked.
  const teamPokemonList = team.team_pokemon
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null);

  return (
    // max-w-builder (1440px) is tuned for the team builder — the
    // dashboard normally uses max-w-screen-2xl (1536px), but the
    // 240/1fr/460 grid stops looking balanced past 1440px. Token
    // declared in globals.css as --container-builder.
    <div
      data-testid="team-workspace"
      className="max-w-builder mx-auto w-full px-4 py-6 md:px-6"
    >
      <div
        data-testid="team-workspace-grid"
        // grid-cols-[15rem_minmax(0,1fr)_28.75rem] = 240/auto/460. The
        // `minmax(0,1fr)` is critical — without the explicit `0` minimum,
        // the editor column inflates to its min-content (long species
        // names, picker tables) and pushes the right rail off-balance,
        // which is what made the workspace look shifted.
        className="grid grid-cols-[15rem_minmax(0,1fr)_28.75rem] items-start gap-4 md:gap-6"
      >
        {/* LEFT — Defensive type chart (always visible, even during picker) */}
        <TypeChartPanel team={teamPokemonList} />

        {/* CENTER — Editor card (TeamStrip + PokemonEditor) OR species picker
            overlay. The picker replaces the editor card in this column only,
            keeping the type chart on the left and analytics rail on the right
            visible for cross-reference. */}
        {pickerState.open ? (
          <div
            data-testid="team-workspace-center"
            className="bg-card overflow-hidden rounded-lg shadow-sm"
          >
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
              formatId={format?.id}
              onSelect={handleSpeciesSelect}
              onCancel={handlePickerCancel}
            />
          </div>
        ) : (
          <div
            data-testid="team-workspace-center"
            className="bg-card overflow-hidden rounded-lg shadow-sm"
          >
            {/* Team strip — horizontal row of 6 chips, sits inside the same
                card as the editor with a single divider between them. */}
            <div className="border-b">
              <TeamStrip
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
            </div>

            {/* Editor — chrome neutralized so it reads as one unified card
                with the team strip above. */}
            {isPlaceholder ? (
              <PokemonEditor
                key="placeholder"
                pokemon={PLACEHOLDER_POKEMON}
                format={resolvedFormat}
                teamPokemon={[]}
                onUpdate={() => {
                  /* no-op: disabled placeholder */
                }}
                fieldErrors={[]}
                disabled={true}
                className={EDITOR_CHROME_OVERRIDE}
              />
            ) : selectedEntry?.pokemon ? (
              <PokemonEditor
                key={selectedEntry.pokemon.id}
                pokemon={selectedEntry.pokemon}
                format={resolvedFormat}
                teamPokemon={team.team_pokemon}
                onUpdate={(field, value) =>
                  handlePokemonUpdate(selectedEntry.pokemon!.id, field, value)
                }
                onOpenSpeciesPicker={() =>
                  setPickerState({
                    open: true,
                    slot: selectedEntry.team_position - 1,
                    mode: "change",
                  })
                }
                fieldErrors={selectedFieldErrors}
                className={EDITOR_CHROME_OVERRIDE}
              />
            ) : (
              <div className="flex items-center justify-center px-4 py-12">
                <p className="text-muted-foreground text-sm">
                  Select a Pokémon to edit
                </p>
              </div>
            )}
          </div>
        )}

        {/* RIGHT — Analytics rail (Speed / Calc tabs at fixed 460px) */}
        <AnalyticsRail
          team={team}
          selectedPokemon={selectedEntry?.pokemon ?? null}
          format={resolvedFormat}
        />
      </div>

      {/* Pending overlay while adding/changing species */}
      {isPending && (
        <div className="bg-background/50 fixed inset-0 z-40 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Saving...</p>
        </div>
      )}
    </div>
  );
}
