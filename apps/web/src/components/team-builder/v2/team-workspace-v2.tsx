"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { type GameFormat } from "@trainers/pokemon";
import {
  type TeamWithPokemon,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "@trainers/supabase";

import {
  addPokemonToTeamAction,
  removePokemonFromTeamAction,
  reorderTeamPokemonAction,
  updatePokemonAction,
  updateTeamAction,
} from "@/actions/teams";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportMenu } from "../export-menu";
import { ImportDialog } from "../import-dialog";
import { useTeamValidation } from "../validation-hooks";
import { CalcBottomPanel } from "./calc/calc-bottom-panel";
import {
  CalcStateProvider,
  useCalcStateContext,
} from "./calc/calc-state-context";
import { Dockbar } from "./dock/dockbar";
import { getTeamDefensiveSummary } from "./dock/heatmap-panel";
import { getTeamFastestSpeed } from "./dock/speed-tiers-panel";
import { HeatmapPanel } from "./dock/heatmap-panel";
import { SpeedTiersPanel } from "./dock/speed-tiers-panel";
import { Topbar } from "./topbar";
import { PokeRow } from "./poke-row";
import { useBuilderState } from "./use-builder-state";
import { useTeamLayout, TeamLayoutContext } from "./use-team-layout";

// =============================================================================
// KO-tier semantic tokens (migrated from .builderApp's CSS-module rule).
//
// These cascade to every descendant, so move tiles, calc detail cards, etc.
// can read `var(--ko-red)` / `var(--ko-amber-bg)` without redefining the
// tokens at every consumer. Previously lived inline in globals.css.
//   • --ko-red    — OHKO indicator; reuses --destructive so the theme wins
//   • --ko-amber* — 2HKO band, with bg/fg variants for tile background vs text
//   • --ko-yellow*— 3HKO band, same bg/fg split
//   • --ko-green* — super-effective hint
//   • --ko-ne     — not-very-effective hint
// =============================================================================
const builderTokenStyle: React.CSSProperties = {
  "--ko-red": "var(--destructive)",
  "--ko-amber-bg": "oklch(0.7 0.15 80)",
  "--ko-amber-fg": "oklch(0.65 0.15 80)",
  "--ko-amber2-fg": "oklch(0.65 0.15 55)",
  "--ko-yellow-bg": "oklch(0.78 0.15 90)",
  "--ko-yellow-fg": "oklch(0.72 0.15 90)",
  "--ko-green": "oklch(0.72 0.2 145)",
  "--ko-green-fg": "oklch(0.6 0.2 145)",
  "--ko-ne": "oklch(0.55 0.15 30)",
  "--builder-shadow": "oklch(0 0 0 / 30%)",
  "--builder-backdrop": "oklch(0 0 0 / 25%)",
} as React.CSSProperties;

// =============================================================================
// Types
// =============================================================================

interface TeamWorkspaceV2Props {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  username: string;
}

// =============================================================================
// Slot computation
// =============================================================================

/**
 * Builds a stable 6-slot array from team_pokemon, indexed by team_position.
 * `slots[i]` is the pokemon at team_position `i + 1`, or null if no row exists
 * for that position. The UI's slot index → DB position mapping is 1:1, so
 * handleAdd's `position = idx + 1` always targets the slot the user clicked.
 */
function buildSlots(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): (Tables<"pokemon"> | null)[] {
  const slots: (Tables<"pokemon"> | null)[] = Array.from(
    { length: 6 },
    () => null
  );
  for (const entry of teamPokemon) {
    const idx = entry.team_position - 1;
    if (idx >= 0 && idx < 6) {
      slots[idx] = entry.pokemon ?? null;
    }
  }
  return slots;
}

type OptimisticAction =
  | {
      kind: "update";
      pokemonId: number;
      fields: Partial<TablesUpdate<"pokemon">>;
    }
  | {
      kind: "add";
      position: number;
      species: string;
      // Generated in the event handler so the reducer stays pure — React may
      // invoke the reducer multiple times during reconciliation, and the row
      // must keep the same React key across every call.
      tempId: number;
    }
  | { kind: "remove"; pokemonId: number };

/**
 * Build a placeholder team_pokemon entry for an optimistic add. Defaults
 * mirror addPokemonToTeamAction (ability/move1 empty, Serious nature) so
 * the optimistic row matches what the DB actually inserts.
 */
function buildOptimisticTeamPokemon(
  species: string,
  position: number,
  tempId: number
): TeamWithPokemon["team_pokemon"][number] {
  // Numeric and boolean defaults mirror pokemonPayloadSchema's `.default(...)`
  // values — the same defaults the server applies on insert. Without them the
  // optimistic row would render with null fields then visibly snap to 50/0/31
  // when router.refresh lands the canonical row.
  const pokemon: Tables<"pokemon"> = {
    id: tempId,
    species,
    ability: "",
    move1: "",
    move2: null,
    move3: null,
    move4: null,
    nature: "Serious",
    nickname: null,
    notes: null,
    held_item: null,
    tera_type: null,
    gender: null,
    is_shiny: false,
    level: 50,
    format_legal: null,
    created_at: null,
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
  };
  return {
    id: tempId,
    pokemon_id: tempId,
    team_position: position,
    pokemon,
  };
}

// =============================================================================
// DockbarConnected
// =============================================================================

interface DockbarConnectedProps {
  drawer: "matchups" | "speed" | "calc" | null;
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  weakCount: number;
  coveredCount: number;
  fastest: number;
}

/**
 * Wraps Dockbar with calc state read from CalcStateContext.
 * Must be mounted inside a CalcStateProvider.
 */
function DockbarConnected({
  drawer,
  onOpen,
  weakCount,
  coveredCount,
  fastest,
}: DockbarConnectedProps) {
  const calc = useCalcStateContext();

  return (
    <Dockbar
      drawer={drawer}
      onOpen={onOpen}
      weakCount={weakCount}
      coveredCount={coveredCount}
      fastest={fastest}
      defenderSpecies={calc.defenderSpecies}
      moveCalcOutputs={calc.moveCalcOutputs}
    />
  );
}

// =============================================================================
// TeamWorkspaceV2
// =============================================================================

/**
 * Top-level client component for the v2 team builder workspace.
 * Owns layout orchestration: Topbar, PokeRow list, calc drawer slot.
 * Uses optimistic write path via useOptimistic + updatePokemonAction.
 * Wires useTeamValidation → per-slot error badges + lane field errors.
 */
export function TeamWorkspaceV2({
  team,
  format,
  username,
}: TeamWorkspaceV2Props) {
  const router = useRouter();
  const state = useBuilderState();

  /** Controls the import sheet. */
  const [importOpen, setImportOpen] = useState(false);

  /** Slot index awaiting remove confirmation. null = dialog closed. */
  const [removeSlotIdx, setRemoveSlotIdx] = useState<number | null>(null);

  /** Ref to the worklane element — used by the panel resizer to compute the
   *  pointer's offset within the lane during drag. */
  const worklaneRef = useRef<HTMLDivElement | null>(null);

  /**
   * Counter for placeholder ids on optimistic adds. Negative so they can
   * never collide with real DB ids (bigint identity columns are always
   * positive); decremented per call so multiple concurrent adds still get
   * unique React keys. Lives on a ref so it's instance-scoped — no module-
   * level shared state across tabs, tests, or HMR reloads.
   */
  const nextOptimisticIdRef = useRef(-1);

  // ---------------------------------------------------------------------------
  // Optimistic team-pokemon state
  //
  // The reducer must stay pure — React may call it multiple times during
  // reconciliation. Side effects (e.g., generating temp ids for `add`) live
  // in the event handler and are passed in via the action payload.
  //
  // router.refresh() ends every transition — on success it lands the canonical
  // server state into the prop so useOptimistic reverts cleanly; on failure
  // it rolls the UI back to last known good. Both paths must call it.
  // ---------------------------------------------------------------------------

  const [optimisticTeamPokemon, applyOptimistic] = useOptimistic(
    team.team_pokemon,
    (current, action: OptimisticAction) => {
      switch (action.kind) {
        case "update":
          return current.map((tp) =>
            tp.pokemon_id === action.pokemonId && tp.pokemon
              ? { ...tp, pokemon: { ...tp.pokemon, ...action.fields } }
              : tp
          );
        case "remove":
          // Filter by pokemon_id (always non-null) rather than pokemon?.id —
          // the join can theoretically yield `pokemon: null` rows even though
          // pokemon_id holds the canonical FK.
          return current.filter((tp) => tp.pokemon_id !== action.pokemonId);
        case "add": {
          // Replace any existing entry at the same position with the placeholder.
          const filtered = current.filter(
            (tp) => tp.team_position !== action.position
          );
          return [
            ...filtered,
            buildOptimisticTeamPokemon(
              action.species,
              action.position,
              action.tempId
            ),
          ];
        }
      }
    }
  );

  const [, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Validation — debounced reactive validation on every optimistic state change.
  // pokemonErrors: Map<pokemonId, ValidationError[]> for per-slot lookup.
  // ---------------------------------------------------------------------------

  const {
    errors: validationErrors,
    pokemonErrors,
    validate,
  } = useTeamValidation(optimisticTeamPokemon, format);

  function handlePokemonUpdate(
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) {
    // Negative ids are optimistic placeholders — the row hasn't landed in
    // the DB yet, so the server can't accept an update for it.
    if (pokemonId < 1) {
      toast.info("Still saving the new Pokémon — try again in a moment.");
      return;
    }
    startTransition(async () => {
      applyOptimistic({ kind: "update", pokemonId, fields });
      const result = await updatePokemonAction(team.id, pokemonId, fields);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save changes.");
      }
      router.refresh();
    });
  }

  function handleAdd(idx: number, speciesId: string) {
    // Position is 1-indexed
    const position = idx + 1;
    // ability / move1 / nature are required by the DB schema. ability and
    // move1 use empty-string placeholders the user fills in via the lane
    // editors; nature defaults to the neutral "Serious" so the row
    // validates immediately. Serious is the canonical neutral nature in
    // the picker (Hardy/Docile/Bashful/Quirky are hidden as duplicates).
    const pokemon: TablesInsert<"pokemon"> = {
      species: speciesId,
      ability: "",
      move1: "",
      nature: "Serious",
    };
    // Generate the temp id here, not in the reducer — the reducer must be
    // pure across React's reconciliation re-invocations.
    const tempId = nextOptimisticIdRef.current--;

    startTransition(async () => {
      applyOptimistic({ kind: "add", position, species: speciesId, tempId });
      const result = await addPokemonToTeamAction(team.id, pokemon, position);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add Pokémon.");
        router.refresh();
        return;
      }
      toast.success(`${speciesId} added to slot ${position}.`);
      router.refresh();
    });
  }

  /** Opens the remove confirmation dialog for the given slot index. */
  function handleRequestRemove(idx: number) {
    setRemoveSlotIdx(idx);
  }

  /** Called when the user confirms removal in the AlertDialog. */
  function handleConfirmRemove() {
    if (removeSlotIdx === null) return;
    const p = slots[removeSlotIdx];
    setRemoveSlotIdx(null);
    if (!p) return;
    const pokemonId = p.id;

    if (pokemonId < 1) {
      toast.info("Still saving the new Pokémon — try again in a moment.");
      return;
    }

    startTransition(async () => {
      applyOptimistic({ kind: "remove", pokemonId });
      const result = await removePokemonFromTeamAction(team.id, pokemonId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove Pokémon.");
        router.refresh();
        return;
      }
      toast.success("Pokémon removed.");
      router.refresh();
    });
  }

  const isMobile = useIsMobile();
  const { mode: layoutMode } = useTeamLayout();

  // ---------------------------------------------------------------------------
  // DnD sensors
  // PointerSensor with activationConstraint.distance=8 so click events on the
  // rib's × button still fire before dragging starts.
  // KeyboardSensor for accessibility.
  // ---------------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---------------------------------------------------------------------------
  // Reorder override
  //
  // After a drag, we store an ordered list of pokemon IDs so the UI reflects
  // the new order optimistically while the server action runs. `null` means
  // "use the default order from buildSlots(optimisticTeamPokemon)".
  // On router.refresh() this resets naturally (the component re-renders with
  // the updated team_pokemon positions from the server).
  // ---------------------------------------------------------------------------

  const [reorderIds, setReorderIds] = useState<(number | null)[] | null>(null);

  const baseSlots = buildSlots(optimisticTeamPokemon);

  // Apply the reorder override if present, otherwise use derived order.
  const slots: (Tables<"pokemon"> | null)[] = reorderIds
    ? reorderIds.map((id) =>
        id === null ? null : (baseSlots.find((p) => p?.id === id) ?? null)
      )
    : baseSlots;

  // Calc-panel "focused attacker" row — independent of workspace activeIdx so
  // the chip strip in the calc bottom panel can target a different mon than
  // the one being edited. Falls back to activeIdx when attackerSlot is stale
  // (e.g. localStorage points at a slot that's empty on the loaded team).
  // The calc engine uses this row's pokemon for boosts/status/mega/crit
  // tweaks; every other row in the team computes against neutral baseline.
  const calcAttackerIdx =
    state.attackerSlot !== null && slots[state.attackerSlot] != null
      ? state.attackerSlot
      : state.activeIdx;

  // Stable IDs for dnd-kit: pokemon.id (as string) for filled, placeholder for empty.
  const itemIds = slots.map((p, i) =>
    p !== null ? String(p.id) : `__empty__${i}`
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Block reorder while any optimistic placeholder is pending — its negative
    // id can't be sent to reorderTeamPokemonAction (rejected by positiveIntSchema)
    // and a partial reorder would desync the UI from the server.
    if (optimisticTeamPokemon.some((tp) => tp.pokemon_id < 1)) {
      toast.info("Still saving the new Pokémon — try reordering in a moment.");
      return;
    }

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const prevSlots = slots;
    const nextSlots = arrayMove(slots, oldIndex, newIndex);

    // Optimistic update — update display immediately.
    setReorderIds(nextSlots.map((p) => p?.id ?? null));

    const positions = nextSlots
      .map((p, i) => (p !== null ? { pokemonId: p.id, position: i + 1 } : null))
      .filter((x): x is { pokemonId: number; position: number } => x !== null);

    if (positions.length === 0) return;

    const result = await reorderTeamPokemonAction(team.id, positions);
    if (!result.success) {
      toast.error(result.error ?? "Failed to reorder team.");
      // Revert to previous order.
      setReorderIds(prevSlots.map((p) => p?.id ?? null));
      return;
    }
    // Server confirmed — let router.refresh() restore the canonical order.
    router.refresh();
    setReorderIds(null);
  }

  const filledCount = slots.filter(Boolean).length;

  // Pre-compute dock-pill summaries once here so DockbarConnected never runs
  // getTeamDefensiveSummary / getTeamFastestSpeed on every EV slider tick.
  const defensiveSummary = getTeamDefensiveSummary(optimisticTeamPokemon);
  const fastestSpeed = format
    ? getTeamFastestSpeed(optimisticTeamPokemon, format)
    : 0;

  // onRemove for PokeRow — accepts slot idx, opens confirmation dialog
  function handleRemoveByIdx(idx: number) {
    handleRequestRemove(idx);
  }

  /**
   * Called from the Topbar validation popover when the user clicks an error row.
   * Finds the slot index for the given pokemonId and activates it.
   */
  function handleJumpToPokemon(pokemonId: number) {
    const slotIdx = slots.findIndex((p) => p?.id === pokemonId);
    if (slotIdx !== -1) {
      state.setActiveIdx(slotIdx);
    }
  }

  return (
    <TeamLayoutContext.Provider value={layoutMode}>
      <CalcStateProvider
        selectedPokemon={slots[calcAttackerIdx] ?? null}
        format={format}
        field={state.field}
        setField={state.setField}
        calcEnabled={state.drawer === "calc"}
        faintedYours={state.faintedYours}
        faintedTheirs={state.faintedTheirs}
      >
      <div
        className="flex h-full flex-col overflow-hidden"
        style={builderTokenStyle}
      >
        <Topbar
          team={team}
          filledCount={filledCount}
          format={format}
          username={username}
          onOpenImport={() => setImportOpen(true)}
          validationErrors={validationErrors}
          onJumpToPokemon={handleJumpToPokemon}
          onValidate={validate}
          onFormatChange={async (formatId) => {
            const result = await updateTeamAction(team.id, {
              format: formatId,
            });
            if (!result.success) {
              toast.error(result.error ?? "Failed to update format.");
              return;
            }
            router.refresh();
          }}
          exportMenu={<ExportMenu team={team} />}
        />

        <div className="flex flex-1 min-h-0 overflow-y-hidden overflow-x-visible">
          <div
            className="flex flex-1 flex-col min-w-0 overflow-y-hidden overflow-x-visible"
            ref={worklaneRef}
          >
            {/* Editor region — rows scroll inside this region only */}
            <div className="flex flex-auto min-h-0 overflow-y-auto overflow-x-visible">
              {/* Rows grid */}
              <section
                // Tailwind 4 strips quotes from values inside data-* / arbitrary
                // variants when emitting the CSS selector, and Lightning CSS
                // then rejects digit-prefixed values like 2x3-vertical
                // (they look like CSS dimensions). Apply layout-specific grid
                // classes conditionally instead of via [data-layout=...]:.
                className={cn(
                  "grid w-full my-auto max-w-[1800px] grid-cols-[minmax(0,1fr)] gap-2 p-3 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] [[data-density=compact]_&]:gap-1 [[data-density=compact]_&]:p-2",
                  // Center rows when no side panel is open
                  !(state.drawer === "calc" || state.drawer === "speed") && "mx-auto",
                  // Remove max-width constraint when side panel is open to reduce gap
                  (state.drawer === "calc" || state.drawer === "speed") && !isMobile && "max-w-none",
                  layoutMode === "2x3-vertical" &&
                    "grid-cols-[repeat(auto-fit,minmax(585px,1fr))] justify-center",
                  // When calc/speed is open on desktop, let rows section shrink
                  !isMobile && (state.drawer === "calc" || state.drawer === "speed") && "flex-1 min-w-0"
                )}
                data-calc-open={
                  state.drawer === "calc" && !isMobile ? "true" : "false"
                }
                data-layout={layoutMode}
              >
                {isMobile ? (
                  // Mobile: no drag-and-drop, render rows directly.
                  slots.map((p, i) => {
                    const slotPokemonId = p?.id ?? null;
                    const slotErrors =
                      slotPokemonId !== null
                        ? (pokemonErrors.get(slotPokemonId) ?? [])
                        : [];

                    return (
                      <PokeRow
                        key={itemIds[i]}
                        sortableId={itemIds[i] ?? `__empty__${i}`}
                        idx={i}
                        pokemon={p}
                        isActive={state.activeIdx === i}
                        density="comfy"
                        expandMode="all"
                        onActivate={state.setActiveIdx}
                        onAdd={handleAdd}
                        onRemove={handleRemoveByIdx}
                        teamPokemon={optimisticTeamPokemon}
                        format={format}
                        onPokemonUpdate={handlePokemonUpdate}
                        slotErrors={slotErrors}
                      />
                    );
                  })
                ) : (
                  // Desktop: wrap in DnD context for drag-and-drop reordering.
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={itemIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {slots.map((p, i) => {
                        const slotPokemonId = p?.id ?? null;
                        const slotErrors =
                          slotPokemonId !== null
                            ? (pokemonErrors.get(slotPokemonId) ?? [])
                            : [];

                        return (
                          <PokeRow
                            key={itemIds[i]}
                            sortableId={itemIds[i] ?? `__empty__${i}`}
                            idx={i}
                            pokemon={p}
                            isActive={state.activeIdx === i}
                            density="comfy"
                            expandMode="all"
                            onActivate={state.setActiveIdx}
                            onAdd={handleAdd}
                            onRemove={handleRemoveByIdx}
                            teamPokemon={optimisticTeamPokemon}
                            format={format}
                            onPokemonUpdate={handlePokemonUpdate}
                            slotErrors={slotErrors}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </section>
            </div>

              {/* Mobile: calc/speed panels render inline below the editor rows */}
              {isMobile && state.drawer === "calc" && (
                <div className="border-t p-3 w-full">
                  <CalcBottomPanel
                    teamSlots={slots}
                    format={format}
                    onClose={() => state.setDrawer(null)}
                    attackerIdx={calcAttackerIdx}
                    faintedYours={state.faintedYours}
                    setFaintedYours={state.setFaintedYours}
                    faintedTheirs={state.faintedTheirs}
                    setFaintedTheirs={state.setFaintedTheirs}
                  />
                </div>
              )}
              {isMobile && state.drawer === "speed" && (
                <div className="border-t p-3 w-full">
                  <SpeedTiersPanel
                    team={optimisticTeamPokemon}
                    activeIdx={state.activeIdx}
                    format={format}
                  />
                </div>
              )}

            {/* Resizer + bottom panel — only for type matchups */}
            {state.drawer === "matchups" && (
              <>
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize analytics panel"
                  aria-valuemin={20}
                  aria-valuemax={80}
                  aria-valuenow={Math.round(state.panelHeightPct)}
                  tabIndex={0}
                  className="h-[6px] shrink-0 bg-border cursor-row-resize transition-colors duration-[120ms] touch-none hover:bg-primary focus-visible:bg-primary focus-visible:outline-none"
                  onPointerDown={(e) => {
                    const target = e.currentTarget;
                    const worklane = worklaneRef.current;
                    if (!worklane) return;
                    target.setPointerCapture(e.pointerId);
                    const onMove = (ev: PointerEvent) => {
                      const rect = worklane.getBoundingClientRect();
                      const offsetFromTop = ev.clientY - rect.top;
                      const pct =
                        ((rect.height - offsetFromTop) / rect.height) * 100;
                      state.setPanelHeightPct(pct);
                    };
                    const onUp = () => {
                      target.releasePointerCapture(e.pointerId);
                      target.removeEventListener("pointermove", onMove);
                      target.removeEventListener("pointerup", onUp);
                      target.removeEventListener("pointercancel", onUp);
                    };
                    target.addEventListener("pointermove", onMove);
                    target.addEventListener("pointerup", onUp);
                    target.addEventListener("pointercancel", onUp);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      state.setPanelHeightPct(state.panelHeightPct + 5);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      state.setPanelHeightPct(state.panelHeightPct - 5);
                    } else if (e.key === "Home") {
                      e.preventDefault();
                      state.setPanelHeightPct(20);
                    } else if (e.key === "End") {
                      e.preventDefault();
                      state.setPanelHeightPct(80);
                    }
                  }}
                />
                <div
                  className="flex flex-col flex-grow-0 flex-shrink-0 min-h-0 overflow-hidden"
                  style={{ flexBasis: `${state.panelHeightPct}%` }}
                >
                  <section className="flex flex-auto flex-col min-h-0 mx-auto w-[calc(100%-24px)] max-w-[calc(1600px-24px)] rounded-t-[10px] border border-b-0 border-border bg-background overflow-hidden">
                    <header className="flex items-start gap-3 px-3.5 py-2.5 border-b border-border bg-muted">
                      <div className="flex flex-auto min-w-0 flex-col gap-0.5">
                        <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                          DEFENSIVE
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">
                          Defensive type coverage
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          18 attacking types × your 6 slots
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => state.setDrawer(null)}
                        aria-label="Close panel"
                        title="Close panel"
                        className="shrink-0 size-[26px] rounded-md border border-border bg-transparent text-base flex items-center justify-center text-muted-foreground cursor-pointer transition-colors duration-[120ms] hover:bg-background hover:text-foreground"
                      >
                        ×
                      </button>
                    </header>
                    <div className="flex flex-auto flex-col min-h-0 overflow-y-auto">
                      <HeatmapPanel
                        team={optimisticTeamPokemon}
                        format={format}
                      />
                    </div>
                  </section>
                </div>
              </>
            )}

          </div>

          {/* Desktop: calc/speed card — stays fixed adjacent to editor, scrolls independently */}
          {!isMobile && (state.drawer === "calc" || state.drawer === "speed") && (
            <div className="w-[580px] shrink-0 self-stretch overflow-y-auto py-3 pr-2 flex items-center">
              {state.drawer === "calc" && (
                <CalcBottomPanel
                  teamSlots={slots}
                  format={format}
                  onClose={() => state.setDrawer(null)}
                  attackerIdx={calcAttackerIdx}
                  faintedYours={state.faintedYours}
                  setFaintedYours={state.setFaintedYours}
                  faintedTheirs={state.faintedTheirs}
                  setFaintedTheirs={state.setFaintedTheirs}
                />
              )}
              {state.drawer === "speed" && (
                <div className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-primary/60 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]">
                  <div className="flex w-7 shrink-0 flex-col items-center justify-between border-r border-border/60 border-dashed bg-primary/10 py-2">
                    <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-primary [writing-mode:vertical-rl] rotate-180">
                      SPEED
                    </span>
                    <button
                      type="button"
                      onClick={() => state.setDrawer(null)}
                      aria-label="Close speed tiers"
                      className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="min-w-0 flex-1 overflow-y-auto">
                    <SpeedTiersPanel
                      team={optimisticTeamPokemon}
                      activeIdx={state.activeIdx}
                      format={format}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DockbarConnected
          drawer={state.drawer}
          onOpen={(key) =>
            state.setDrawer(state.drawer === key ? null : key)
          }
          weakCount={defensiveSummary.weakCount}
          coveredCount={defensiveSummary.coveredCount}
          fastest={fastestSpeed}
        />
      </div>

      {/* Import dialog — opened by topbar Import button */}
      <ImportDialog
        team={team}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => router.refresh()}
        formatId={format?.id}
      />

      {/* Remove confirmation dialog */}
      <AlertDialog
        open={removeSlotIdx !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveSlotIdx(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pokémon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Pokémon from this slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </CalcStateProvider>
    </TeamLayoutContext.Provider>
  );
}
