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
} from "@/actions/teams";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExportMenu } from "../export-menu";
import { ImportDialog } from "../import-dialog";
import { useTeamValidation } from "../validation-hooks";
import { CalcBottomPanel } from "./calc/calc-bottom-panel";
import { CalcDrawer } from "./calc/calc-drawer";
import {
  CalcStateProvider,
  useCalcStateContext,
} from "./calc/calc-state-context";
import { Dockbar } from "./dock/dockbar";
import { HeatmapPanel } from "./dock/heatmap-panel";
import { SpeedTiersPanel } from "./dock/speed-tiers-panel";
import { Topbar } from "./topbar";
import { PokeRow } from "./poke-row";
import { useBuilderState } from "./use-builder-state";
import s from "./builder.module.css";

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
 *
 * NB: previously this sorted entries and packed them into [0..n], which meant
 * a team with positions [3, 4] rendered into UI slots 01/02 — clicking the
 * visually-empty "03" then hit a duplicate-key violation when the action
 * inserted at position 3.
 */
function buildSlots(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): (Tables<"pokemon"> | null)[] {
  const slots: (Tables<"pokemon"> | null)[] = Array.from({ length: 6 }, () => null);
  for (const entry of teamPokemon) {
    const idx = entry.team_position - 1;
    if (idx >= 0 && idx < 6) {
      slots[idx] = entry.pokemon ?? null;
    }
  }
  return slots;
}

// =============================================================================
// DockbarConnected
// =============================================================================

interface DockbarConnectedProps {
  drawer: "matchups" | "speed" | "calc" | null;
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
}

/**
 * Wraps Dockbar with calc state read from CalcStateContext.
 * Must be mounted inside a CalcStateProvider.
 */
function DockbarConnected({
  drawer,
  onOpen,
  team,
  format,
}: DockbarConnectedProps) {
  const calc = useCalcStateContext();

  return (
    <Dockbar
      drawer={drawer}
      onOpen={onOpen}
      team={team}
      format={format}
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
 * Phase 2: adds optimistic write path via useOptimistic + updatePokemonAction.
 * Phase 7: wires useTeamValidation → per-slot error badges + lane field errors.
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

  /** Ref to the worklane element — used by the panel resizer to compute the
   *  pointer's offset within the lane during drag. */
  const worklaneRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // Optimistic team-pokemon state — Phase 2 write path
  //
  // applyOptimisticPatch updates the UI on the next paint; the server save runs
  // in the background via startTransition. On failure: toast + revert.
  // ---------------------------------------------------------------------------

  const [optimisticTeamPokemon, applyOptimisticPatch] = useOptimistic(
    team.team_pokemon,
    (
      current,
      {
        pokemonId,
        fields,
      }: { pokemonId: number; fields: Partial<Tables<"pokemon">> }
    ) =>
      current.map((tp) =>
        tp.pokemon_id === pokemonId && tp.pokemon
          ? { ...tp, pokemon: { ...tp.pokemon, ...fields } }
          : tp
      )
  );

  const [, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Validation — Phase 7
  // Debounced reactive validation on every optimistic state change.
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
    startTransition(async () => {
      applyOptimisticPatch({ pokemonId, fields });
      const result = await updatePokemonAction(team.id, pokemonId, fields);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save changes.");
        return;
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

    startTransition(async () => {
      const result = await addPokemonToTeamAction(team.id, pokemon, position);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add Pokémon.");
        return;
      }
      toast.success(`${speciesId} added to slot ${position}.`);
      router.refresh();
    });
  }

  function handleRemove(pokemonId: number) {
    if (!window.confirm("Remove this Pokémon from the team?")) return;

    startTransition(async () => {
      const result = await removePokemonFromTeamAction(team.id, pokemonId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove Pokémon.");
        return;
      }
      toast.success("Pokémon removed.");
      router.refresh();
    });
  }

  const isMobile = useIsMobile();

  // ---------------------------------------------------------------------------
  // DnD sensors — Phase 8
  // PointerSensor with activationConstraint.distance=8 so click events on the
  // rib's × button still fire before dragging starts.
  // KeyboardSensor for accessibility.
  // ---------------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---------------------------------------------------------------------------
  // Reorder override — Phase 8
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

  // Stable IDs for dnd-kit: pokemon.id (as string) for filled, placeholder for empty.
  const itemIds = slots.map((p, i) =>
    p !== null ? String(p.id) : `__empty__${i}`
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const prevSlots = slots;
    const nextSlots = arrayMove(slots, oldIndex, newIndex);

    // Optimistic update — update display immediately.
    setReorderIds(nextSlots.map((p) => p?.id ?? null));

    const positions = nextSlots
      .map((p, i) =>
        p !== null ? { pokemonId: p.id, position: i + 1 } : null
      )
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

  // onRemove for PokeRow — accepts slot idx, resolves to pokemonId
  function handleRemoveByIdx(idx: number) {
    const p = slots[idx];
    if (!p) return;
    handleRemove(p.id);
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
    <CalcStateProvider
      selectedPokemon={slots[state.activeIdx] ?? null}
      format={format}
      field={state.field}
      setField={state.setField}
      calcEnabled={true}
      faintedYours={state.faintedYours}
      faintedTheirs={state.faintedTheirs}
    >
      <div className={s.builderApp}>
        <Topbar
          team={team}
          filledCount={filledCount}
          format={format}
          username={username}
          onOpenImport={() => setImportOpen(true)}
          onSave={() => console.warn("[Phase 1 stub] save")}
          validationErrors={validationErrors}
          onJumpToPokemon={handleJumpToPokemon}
          onValidate={validate}
          exportMenu={<ExportMenu team={team} />}
        />

        <div className={s.builderWorkshell}>
          <div className={s.builderWorklane} ref={worklaneRef}>
            {/* Editor region — rows scroll inside this region only */}
            <div className={s.editorRegion}>
              <section className={s.builderRows}>
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

            {/* Resizer + analytics panel region — only when panel is open */}
            {state.drawer !== null && (
              <>
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize analytics panel"
                  aria-valuemin={20}
                  aria-valuemax={80}
                  aria-valuenow={Math.round(state.panelHeightPct)}
                  tabIndex={0}
                  className={s.resizer}
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
                    };
                    target.addEventListener("pointermove", onMove);
                    target.addEventListener("pointerup", onUp);
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
                  className={s.panelRegion}
                  style={{ flexBasis: `${state.panelHeightPct}%` }}
                >
                  {/* Type matchups and Speed tiers keep their existing header chrome */}
                  {(state.drawer === "matchups" ||
                    state.drawer === "speed") && (
                    <section className={s.inlinePanel}>
                      <header className={s.inlinePanelHead}>
                        <div className={s.inlinePanelHeadL}>
                          <span className={s.inlinePanelEyebrow}>
                            {state.drawer === "matchups"
                              ? "DEFENSIVE"
                              : "SPEED"}
                          </span>
                          <span className={s.inlinePanelTitle}>
                            {state.drawer === "matchups"
                              ? "Defensive type coverage"
                              : "Speed tier ladder"}
                          </span>
                          <span className={s.inlinePanelSub}>
                            {state.drawer === "matchups"
                              ? "18 attacking types × your 6 slots"
                              : "Your team vs the format · all values @ Lv 50"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => state.setDrawer(null)}
                          aria-label="Close panel"
                          title="Close panel"
                          className={s.inlinePanelClose}
                        >
                          ×
                        </button>
                      </header>
                      <div className={s.inlinePanelBody}>
                        {state.drawer === "matchups" && (
                          <HeatmapPanel
                            team={optimisticTeamPokemon}
                            format={format}
                          />
                        )}
                        {state.drawer === "speed" && (
                          <SpeedTiersPanel
                            team={optimisticTeamPokemon}
                            activeIdx={state.activeIdx}
                            format={format}
                          />
                        )}
                      </div>
                    </section>
                  )}

                  {/* Calc panel — desktop only; mobile falls back to CalcDrawer Sheet */}
                  {state.drawer === "calc" && !isMobile && (
                    <CalcBottomPanel
                      selectedPokemon={slots[state.activeIdx] ?? null}
                      team={team}
                      format={format}
                      onClose={() => state.setDrawer(null)}
                      attackerIdx={state.attackerSlot ?? state.activeIdx}
                      onPickAttacker={(idx) =>
                        state.setAttackerSlot(
                          idx === state.activeIdx ? null : idx
                        )
                      }
                      faintedYours={state.faintedYours}
                      setFaintedYours={state.setFaintedYours}
                      faintedTheirs={state.faintedTheirs}
                      setFaintedTheirs={state.setFaintedTheirs}
                    />
                  )}
                </div>
              </>
            )}

            <DockbarConnected
              drawer={state.drawer}
              onOpen={(key) =>
                state.setDrawer(state.drawer === key ? null : key)
              }
              team={optimisticTeamPokemon}
              format={format}
            />
          </div>

          {/* Mobile: when the dock "Damage calc" pill is active, show calc as Sheet */}
          {state.drawer === "calc" && isMobile && (
            <CalcDrawer
              open
              selectedPokemon={slots[state.activeIdx] ?? null}
              team={team}
              format={format}
              onClose={() => state.setDrawer(null)}
            />
          )}
        </div>
      </div>

      {/* Import dialog — opened by topbar Import button */}
      <ImportDialog
        team={team}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => router.refresh()}
        formatId={format?.id}
      />

    </CalcStateProvider>
  );
}
