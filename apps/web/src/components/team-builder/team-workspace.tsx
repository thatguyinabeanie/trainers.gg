"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  type GameFormat,
  buildSpeciesSearchIndex,
  getFormatById,
  getMegaStoneForSpecies,
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
 * Manages selected pokemon state and composes the editor card
 * (team strip + pokemon editor) and analytics rail.
 *
 * Layout — fixed 2-column grid inside a 1536px container:
 *   - LEFT (1fr): Editor card — TeamStrip on top, PokemonEditor below
 *   - RIGHT (460px): AnalyticsRail — Types / Speed / Calc tabs
 *
 * The type chart now lives inside the analytics rail's Types tab, which
 * gives the editor column ~300px more width while keeping coverage analysis
 * accessible without a dedicated left column.
 *
 * Species picker overlay: when open, replaces the center column only so the
 * right analytics rail stays visible for cross-reference.
 */
export function TeamWorkspace({ team, format }: TeamWorkspaceProps) {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Optimistic field patches
  //
  // Map<pokemonId, Partial<Tables<"pokemon">>> — when the user edits a field
  // (move, ability, item, EV…) we write the new value here SYNCHRONOUSLY so
  // the editor re-renders against the new value on the very next paint. The
  // server save runs in the background — we never block the UI on it.
  //
  // Patches survive across pokemon re-fetches until the server-side value
  // matches the optimistic value, at which point they're cleared (in the
  // sync effect below). This keeps the "saving" → "saved" round trip seamless
  // without a flash where the field reverts to the old value while the
  // request is still in flight.
  // ---------------------------------------------------------------------------
  const [optimisticPatches, setOptimisticPatches] = useState<
    Map<number, Partial<Tables<"pokemon">>>
  >(() => new Map());

  // Reconcile optimistic patches against the freshly-fetched team data — drop
  // any field whose server value now matches the optimistic value (the save
  // landed) so subsequent prop updates flow through cleanly.
  useEffect(() => {
    setOptimisticPatches((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const tp of team.team_pokemon) {
        const patch = next.get(tp.pokemon_id);
        if (!patch || !tp.pokemon) continue;
        const remaining: Partial<Tables<"pokemon">> = {};
        let kept = 0;
        for (const [field, value] of Object.entries(patch)) {
          const serverValue = (tp.pokemon as Record<string, unknown>)[field];
          if (serverValue === value) {
            changed = true;
            continue;
          }
          (remaining as Record<string, unknown>)[field] = value;
          kept += 1;
        }
        if (kept === 0) {
          next.delete(tp.pokemon_id);
        } else if (kept !== Object.keys(patch).length) {
          next.set(tp.pokemon_id, remaining);
        }
      }
      return changed ? next : prev;
    });
  }, [team.team_pokemon]);

  // Apply optimistic patches over the server-fetched team_pokemon so every
  // downstream consumer (editor, type chart, validation, analytics rail) sees
  // the user's edits the instant they happen.
  const teamPokemon = team.team_pokemon.map((tp) => {
    const patch = optimisticPatches.get(tp.pokemon_id);
    if (!patch || !tp.pokemon) return tp;
    return { ...tp, pokemon: { ...tp.pokemon, ...patch } };
  });

  // Sort pokemon by position and get the first one as default selection
  const sortedPokemon = [...teamPokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(
    sortedPokemon[0]?.pokemon_id ?? null
  );
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Per-pokemon pending field updates — accumulates fields edited inside the
  // 500ms debounce window so they save in a single round trip rather than
  // racing against each other.
  const pendingUpdatesRef = useRef<Map<number, Partial<Tables<"pokemon">>>>(
    new Map()
  );
  // Track whether a background save is in flight — drives the inline
  // "Saving…" indicator without disabling any inputs.
  const [isSaving, setIsSaving] = useState(false);

  // Species picker state
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    slot: number | null;
    mode: "add" | "change";
  }>({ open: false, slot: null, mode: "add" });

  // Validation runs against the optimistic team so newly-edited fields
  // contribute to the validation panel as soon as they're typed, not 2s later.
  const { pokemonErrors } = useTeamValidation(teamPokemon, format);

  // Resolve the active format with a default fallback so downstream panels
  // (SpeedPanel, CalcPanel, type chart filters) always have a format to drive
  // their calculations off — otherwise SpeedPanel renders the
  // "Speed tiers require a known format" empty state for any team that hasn't
  // had a format set on the row.
  const resolvedFormat: GameFormat | undefined =
    format ?? getFormatById(DEFAULT_FORMAT_ID);

  const speciesIndex = getCachedSpeciesIndex(format?.id ?? DEFAULT_FORMAT_ID);

  // Clear the debounce timer on unmount to prevent setState on an unmounted
  // component. If there are pending field edits, fire them immediately — the
  // server action will still execute even though we don't await it (the
  // component is unmounting).
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pending = pendingUpdatesRef.current;
      if (pending.size === 0) return;
      for (const [pokemonId, updates] of pending) {
        updatePokemonAction(
          team.id,
          pokemonId,
          updates as Parameters<typeof updatePokemonAction>[2]
        ).catch((err) => {
          console.error(
            "[team-workspace] Failed to flush pending save on unmount:",
            err
          );
        });
      }
      pending.clear();
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
  // Auto-save handler — optimistic UI + 500ms debounced background save
  //
  // Three guarantees:
  //   1. The change is reflected in the UI on the next paint (optimistic).
  //   2. The save runs in the background — no inputs are disabled, no
  //      blocking transition fires.
  //   3. Multiple field edits inside the 500ms window collapse into a single
  //      `updatePokemonAction` call so we don't fire one round trip per
  //      keystroke.
  // ---------------------------------------------------------------------------

  function handlePokemonUpdate(
    pokemonId: number,
    field: string,
    value: unknown
  ) {
    // 1. Optimistic patch — update local state synchronously so the editor,
    //    type chart, validation, and analytics rail all see the new value
    //    immediately. The patch lives until the server save echoes the same
    //    value back, then is cleared in the reconciliation effect.
    setOptimisticPatches((prev) => {
      const next = new Map(prev);
      const existing = next.get(pokemonId) ?? {};
      next.set(pokemonId, { ...existing, [field]: value });
      return next;
    });

    // 2. Accumulate the field into the pending updates map so a flurry of
    //    edits coalesces into one save. The 500ms debounce balances "feels
    //    instant" against "don't hit the API on every keystroke".
    const pending = pendingUpdatesRef.current.get(pokemonId) ?? {};
    pending[field as keyof Tables<"pokemon">] = value as never;
    pendingUpdatesRef.current.set(pokemonId, pending);

    // 3. Reset the debounce — every new edit pushes the save back another
    //    500ms, so a fast typer only triggers one round trip.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushPendingSaves();
    }, 500);
  }

  /**
   * Flushes every pending per-pokemon update through `updatePokemonAction`
   * in parallel. Called by the debounce timer and the species change handler
   * (so a species change doesn't race with a queued field edit on the
   * previous species).
   */
  async function flushPendingSaves() {
    const pending = pendingUpdatesRef.current;
    if (pending.size === 0) return;
    const batch = Array.from(pending.entries());
    pending.clear();
    setIsSaving(true);
    try {
      const results = await Promise.all(
        batch.map(([pokemonId, updates]) =>
          updatePokemonAction(
            team.id,
            pokemonId,
            updates as Parameters<typeof updatePokemonAction>[2]
          )
        )
      );
      for (const result of results) {
        if (!result.success) {
          toast.error(result.error ?? "Failed to save changes.");
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Species picker handlers
  // ---------------------------------------------------------------------------

  function handleStripSelect(pokemonId: number) {
    if (pokemonId === selectedPokemonId) {
      const entry = sortedPokemon.find((tp) => tp.pokemon_id === pokemonId);
      if (entry) {
        setPickerState({
          open: true,
          slot: entry.team_position - 1,
          mode: "change",
        });
      }
    } else {
      setSelectedPokemonId(pokemonId);
    }
  }

  function handleAddNew() {
    const nextSlot = sortedPokemon.length;
    setPickerState({ open: true, slot: nextSlot, mode: "add" });
  }

  function handleSpeciesSelect(
    species: string,
    selectMode: "defaults" | "blank"
  ) {
    // Close the picker immediately — the save runs in the background.
    setPickerState({ open: false, slot: null, mode: "add" });

    if (pickerState.mode === "add") {
      const firstAbility =
        selectMode === "defaults" ? (getValidAbilities(species)[0] ?? "") : "";
      // Auto-assign the matching mega stone when adding a mega species
      const megaStone = getMegaStoneForSpecies(species);
      const pokemon: TablesInsert<"pokemon"> = {
        species,
        ability: firstAbility,
        nature: selectMode === "defaults" ? "Hardy" : "",
        move1: "",
        level: 50,
        ...(megaStone ? { held_item: megaStone } : {}),
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

      // Flush any queued field edits first so they land before we add a
      // new pokemon (they can't reference the new pokemon yet, but this
      // keeps the order deterministic).
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setIsSaving(true);
      addPokemonToTeamAction(team.id, pokemon, position)
        .then((result) => {
          if (result.success) {
            setSelectedPokemonId(result.data.pokemonId);
            router.refresh();
          } else {
            toast.error(result.error ?? "Failed to add Pokémon.");
          }
        })
        .catch(() => {
          toast.error("Failed to add Pokémon.");
        })
        .finally(() => {
          setIsSaving(false);
        });
    } else {
      // change mode — update existing pokemon's species
      const pokemonId = selectedPokemonId;
      if (!pokemonId) return;

      const firstAbility =
        selectMode === "defaults" ? (getValidAbilities(species)[0] ?? "") : "";
      // Auto-assign the matching mega stone when changing to a mega species
      const megaStone = getMegaStoneForSpecies(species);

      const changeFields = {
        species,
        ability: firstAbility,
        nature: selectMode === "defaults" ? "Hardy" : "",
        move1: "",
        move2: null,
        move3: null,
        move4: null,
        ...(megaStone ? { held_item: megaStone } : {}),
        ev_hp: 0,
        ev_attack: 0,
        ev_defense: 0,
        ev_special_attack: 0,
        ev_special_defense: 0,
        ev_speed: 0,
      };

      // Apply an optimistic patch so the editor shows the new species
      // on the next paint without waiting for the server round trip.
      setOptimisticPatches((prev) => {
        const next = new Map(prev);
        next.set(pokemonId, changeFields);
        return next;
      });

      // Drop any queued field edits for this pokemon — the species change
      // wipes moves/EVs/ability anyway, so a stale "set Tackle" save
      // would race against the species reset.
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      pendingUpdatesRef.current.delete(pokemonId);

      setIsSaving(true);
      updatePokemonAction(
        team.id,
        pokemonId,
        changeFields as Parameters<typeof updatePokemonAction>[2]
      )
        .then((result) => {
          if (result.success) {
            router.refresh();
          } else {
            // Revert optimistic patch on failure
            setOptimisticPatches((prev) => {
              const next = new Map(prev);
              next.delete(pokemonId);
              return next;
            });
            toast.error(result.error ?? "Failed to update species.");
          }
        })
        .catch(() => {
          setOptimisticPatches((prev) => {
            const next = new Map(prev);
            next.delete(pokemonId);
            return next;
          });
          toast.error("Failed to update species.");
        })
        .finally(() => {
          setIsSaving(false);
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
    // max-w-builder (1536px) is tuned for the team builder — wide enough
    // that the middle column accommodates long species names in the picker
    // without truncation, while keeping the 240/1fr/460 grid balanced.
    // Token declared in globals.css as --container-builder.
    <div
      data-testid="team-workspace"
      className="max-w-builder mx-auto w-full px-4 py-6 md:px-6"
    >
      <div
        data-testid="team-workspace-grid"
        // grid-cols-[minmax(0,1fr)_28.75rem] = auto/460. The type chart
        // moved into the analytics rail's Types tab so the editor column
        // gains ~300px compared to the old 3-column layout. `minmax(0,1fr)`
        // is still critical — without the explicit `0` minimum the editor
        // column inflates to its min-content width.
        className="grid grid-cols-[minmax(0,1fr)_28.75rem] items-start gap-4 md:gap-6"
      >
        {/* LEFT/CENTER — Editor card (TeamStrip + PokemonEditor) OR species picker
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
                pokemon={teamPokemon}
                selectedPokemonId={selectedPokemonId}
                onSelect={handleStripSelect}
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
                teamPokemon={teamPokemon}
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
                teamId={team.id}
                onImported={() => router.refresh()}
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

        {/* RIGHT — Analytics rail (Types / Speed / Calc tabs at fixed 460px).
            We pass an optimistically-patched team object so the type chart
            inside the Types tab reflects field edits (tera type, species
            changes) the instant the user makes them — same as the editor. */}
        <AnalyticsRail
          team={{ ...team, team_pokemon: teamPokemon }}
          selectedPokemon={selectedEntry?.pokemon ?? null}
          format={resolvedFormat}
        />
      </div>

      {/* Save status indicator — small, fixed, never blocks input.
          All saves (field edits and species add/change) share the same
          `isSaving` flag so the user gets a low-key "Saving…" hint
          without losing focus or interaction. */}
      {isSaving && (
        <div
          role="status"
          aria-live="polite"
          data-testid="team-workspace-save-indicator"
          className="bg-card text-muted-foreground pointer-events-none fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          <span>Saving…</span>
        </div>
      )}
    </div>
  );
}
