"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { CalcPanel } from "./calc-panel";
import { SpeedPanel } from "./speed-panel";

// =============================================================================
// Types
// =============================================================================

type AnalyticsTab = "speed" | "calc";

interface AnalyticsRailProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
  className?: string;
}

interface TabDef {
  id: AnalyticsTab;
  label: string;
}

// =============================================================================
// Constants
// =============================================================================

const TABS: TabDef[] = [
  { id: "speed", label: "Speed" },
  { id: "calc", label: "Calc" },
];

// SpeedPanel and CalcPanel each render their own card chrome
// (`bg-card overflow-hidden rounded-lg shadow-sm`) so they can also be used
// standalone. When mounted inside AnalyticsRail — which provides its own
// chrome on the outer container at a fixed 460px width — we pass these
// neutralizing utility classes to strip the duplicate card styling. The
// panels' `className` is merged into the outer wrapper via `cn()`, so these
// values win against the defaults.
const PANEL_CHROME_OVERRIDE =
  "bg-transparent shadow-none rounded-none overflow-visible";

// =============================================================================
// AnalyticsRail
// =============================================================================

/**
 * Right-rail tabbed wrapper that hosts the Speed and Calc panels at a fixed
 * 460px width. Tab state lives on the rail (so switching pokemon does not
 * reset the active tab), while each panel keeps its own internal state and
 * resets via its own `key` strategy on `selectedPokemon` change.
 *
 * The non-active panel is unmounted (not just hidden) so we don't keep
 * running its calculations.
 */
export function AnalyticsRail({
  team,
  selectedPokemon,
  format,
  className,
}: AnalyticsRailProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("speed");

  return (
    <div
      data-testid="analytics-rail"
      className={cn(
        "bg-card w-rail flex-shrink-0 overflow-hidden rounded-lg shadow-sm",
        className
      )}
    >
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Analytics"
        className="bg-muted/50 grid grid-cols-2 border-b"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`analytics-rail-panel-${tab.id}`}
              id={`analytics-rail-tab-${tab.id}`}
              data-testid={`analytics-rail-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "cursor-pointer px-3 py-2.5 text-center text-xs font-semibold tracking-wide uppercase transition-colors duration-150",
                isActive
                  ? "bg-card text-foreground border-primary -mb-px border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body — only the active panel is mounted */}
      {activeTab === "speed" ? (
        <div
          role="tabpanel"
          id="analytics-rail-panel-speed"
          aria-labelledby="analytics-rail-tab-speed"
          data-testid="analytics-rail-body-speed"
        >
          {selectedPokemon && format ? (
            <SpeedPanel
              selectedPokemon={selectedPokemon}
              team={team.team_pokemon
                .map((tp) => tp.pokemon)
                .filter((p): p is Tables<"pokemon"> => p !== null)}
              format={format}
              className={PANEL_CHROME_OVERRIDE}
            />
          ) : (
            <SpeedEmpty hasPokemon={selectedPokemon !== null} />
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="analytics-rail-panel-calc"
          aria-labelledby="analytics-rail-tab-calc"
          data-testid="analytics-rail-body-calc"
        >
          <CalcPanel
            team={team}
            selectedPokemon={selectedPokemon}
            format={format}
            className={PANEL_CHROME_OVERRIDE}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SpeedEmpty — fallback when SpeedPanel can't render (no selection or format)
// =============================================================================

interface SpeedEmptyProps {
  hasPokemon: boolean;
}

function SpeedEmpty({ hasPokemon }: SpeedEmptyProps) {
  return (
    <div
      data-testid="analytics-rail-speed-empty"
      className="px-4 py-6 text-center"
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Speed tiers
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        {hasPokemon
          ? "Speed tiers require a known format."
          : "Select a Pokémon to see speed tiers."}
      </p>
    </div>
  );
}
