"use client";

import { useEffect } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

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
 * All state lives in useBuilderState().
 */
export function TeamWorkspaceV2({
  team,
  format,
  username,
}: TeamWorkspaceV2Props) {
  const state = useBuilderState();
  const { tweaks } = state;

  const slots = buildSlots(team.team_pokemon);
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
                />
              ))}
            </section>
          </main>

          {/* Phase 5 placeholders — present for layout stability */}
          <div className={s.builderDockbarSlot} aria-hidden />
          <div className={s.builderBottomDrawerSlot} aria-hidden />
        </div>

        {tweaks.showCalc && state.calcOpen && (
          <aside className={s.builderCalcdrawerSlot} aria-hidden>
            <div className="p-4 text-sm text-muted-foreground">
              [Phase 3] Calc drawer
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
