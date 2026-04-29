"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon, type Tables, type TablesUpdate } from "@trainers/supabase";

import { updatePokemonAction } from "@/actions/teams";

import { CalcDrawer } from "./calc/calc-drawer";
import { CalcStateProvider } from "./calc/calc-state-context";
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
 */
export function TeamWorkspaceV2({
  team,
  format,
  username,
}: TeamWorkspaceV2Props) {
  const router = useRouter();
  const state = useBuilderState();
  const { tweaks } = state;

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

  function handleAdd(_idx: number) {
    toast("Coming in Phase 5");
  }

  function handleRemove(_idx: number) {
    toast("Coming in Phase 5");
  }

  const slots = buildSlots(optimisticTeamPokemon);
  const filledCount = slots.filter(Boolean).length;

  // Close the bottom drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && state.drawer !== null) {
        state.setDrawer(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.drawer, state.setDrawer]);

  return (
    <CalcStateProvider
      selectedPokemon={slots[state.activeIdx] ?? null}
      format={format}
      field={state.field}
      setField={state.setField}
    >
      <div
        className={s.builderApp}
        data-density={tweaks.density}
        data-theme={tweaks.theme}
      >
        <Topbar
          team={team}
          filledCount={filledCount}
          format={format}
          username={username}
          calcOpen={state.calcOpen}
          onToggleCalc={() => state.setCalcOpen((o) => !o)}
          onOpenImport={() => console.warn("[Phase 2 stub] open import")}
          onSave={() => console.warn("[Phase 1 stub] save")}
        />

        <div className={s.builderWorkshell}>
          <div className={s.builderWorklane}>
            <main className={s.builderGrid}>
              <section className={s.builderRows}>
                {slots.map((p, i) => (
                  <PokeRow
                    key={i}
                    idx={i}
                    pokemon={p}
                    isActive={state.activeIdx === i}
                    density={tweaks.density}
                    expandMode={tweaks.expandMode}
                    onActivate={state.setActiveIdx}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    teamPokemon={optimisticTeamPokemon}
                    format={format}
                    onPokemonUpdate={handlePokemonUpdate}
                  />
                ))}
              </section>
            </main>

            {/* Phase 5 placeholders — present for layout stability */}
            <div className={s.builderDockbarSlot} aria-hidden />
            <div className={s.builderBottomDrawerSlot} aria-hidden />
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
    </CalcStateProvider>
  );
}
