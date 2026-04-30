"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  updatePokemonAction,
} from "@/actions/teams";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ExportMenu } from "../export-menu";
import { ImportDialog } from "../import-dialog";
import { useTeamValidation } from "../validation-hooks";
import { CalcDrawer } from "./calc/calc-drawer";
import { CalcStateProvider } from "./calc/calc-state-context";
import { Dockbar } from "./dock/dockbar";
import { HeatmapPanel } from "./dock/heatmap-panel";
import { SpeedTiersPanel } from "./dock/speed-tiers-panel";
import { SpeciesPicker } from "./pickers/species-picker";
import { Topbar } from "./topbar";
import { PokeRow } from "./poke-row";
import { TweaksPanel } from "./tweaks/tweaks-panel";
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
 * Builds a stable 6-slot array from team_pokemon, sorted by team_position.
 * Missing positions (1..6) are filled with null.
 * Reuses the same pattern as team-strip.tsx.
 */
function buildSlots(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): (Tables<"pokemon"> | null)[] {
  const sorted = [...teamPokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  return Array.from({ length: 6 }, (_, i) => {
    const entry = sorted[i];
    return entry?.pokemon ?? null;
  });
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
  const { tweaks } = state;

  /** Slot index (0-based) for which the species picker is open. null = closed. */
  const [addPickerForSlot, setAddPickerForSlot] = useState<number | null>(null);

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

  function handleAdd(idx: number) {
    setAddPickerForSlot(idx);
  }

  async function handlePickSpecies(speciesId: string) {
    if (addPickerForSlot === null) return;
    setAddPickerForSlot(null);

    // Position is 1-indexed
    const position = addPickerForSlot + 1;
    // ability / move1 / nature are required by the DB schema; use empty-string
    // defaults so the user can fill them in via the lane editors.
    const pokemon: TablesInsert<"pokemon"> = {
      species: speciesId,
      ability: "",
      move1: "",
      nature: "",
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

  const slots = buildSlots(optimisticTeamPokemon);
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
      calcEnabled={tweaks.showCalc && state.calcOpen}
    >
      <div
        className={s.builderApp}
        data-density={tweaks.density}
      >
        <Topbar
          team={team}
          filledCount={filledCount}
          format={format}
          username={username}
          calcOpen={state.calcOpen}
          onToggleCalc={() => state.setCalcOpen((o) => !o)}
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
                {slots.map((p, i) => {
                  const slotPokemonId = p?.id ?? null;
                  const slotErrors =
                    slotPokemonId !== null
                      ? (pokemonErrors.get(slotPokemonId) ?? [])
                      : [];

                  return (
                    <PokeRow
                      key={i}
                      idx={i}
                      pokemon={p}
                      isActive={state.activeIdx === i}
                      density={tweaks.density}
                      expandMode={tweaks.expandMode}
                      onActivate={state.setActiveIdx}
                      onAdd={handleAdd}
                      onRemove={handleRemoveByIdx}
                      onOpenSpecies={setAddPickerForSlot}
                      teamPokemon={optimisticTeamPokemon}
                      format={format}
                      onPokemonUpdate={handlePokemonUpdate}
                      slotErrors={slotErrors}
                    />
                  );
                })}
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
                  <section className={s.inlinePanel}>
                    <header className={s.inlinePanelHead}>
                      <div className={s.inlinePanelHeadL}>
                        <span className={s.inlinePanelEyebrow}>
                          {state.drawer === "matchups" ? "DEFENSIVE" : "SPEED"}
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
                </div>
              </>
            )}

            <Dockbar
              drawer={state.drawer}
              onOpen={(key) =>
                state.setDrawer(state.drawer === key ? null : key)
              }
              team={optimisticTeamPokemon}
              format={format}
            />
          </div>

          {tweaks.showCalc && state.calcOpen && (
            <CalcDrawer
              open
              selectedPokemon={slots[state.activeIdx] ?? null}
              team={team}
              setActiveIdx={state.setActiveIdx}
              format={format}
              activeIdx={state.activeIdx}
              onClose={() => state.setCalcOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Tweaks floating panel — Phase 6 */}
      <TweaksPanel tweaks={tweaks} setTweak={state.setTweak} />

      {/* Import dialog — opened by topbar Import button */}
      <ImportDialog
        team={team}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => router.refresh()}
        formatId={format?.id}
      />

      {/* Species picker dialog — opened by handleAdd */}
      <Dialog
        open={addPickerForSlot !== null}
        onOpenChange={(open) => {
          if (!open) setAddPickerForSlot(null);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] p-0 sm:max-w-sm">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Add Pokémon to slot{" "}
              {addPickerForSlot !== null ? addPickerForSlot + 1 : ""}
            </DialogTitle>
          </DialogHeader>
          <SpeciesPicker
            value={null}
            format={format}
            onPick={handlePickSpecies}
            onClose={() => setAddPickerForSlot(null)}
          />
        </DialogContent>
      </Dialog>
    </CalcStateProvider>
  );
}
