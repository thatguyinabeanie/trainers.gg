"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

import { CalcPanel } from "./calc-panel";
import { SpeedPanel } from "./speed-panel";
import { TypeChartPanel } from "./type-chart-panel";

// =============================================================================
// Types
// =============================================================================

interface AnalyticsRailProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
  className?: string;
}

// SpeedPanel, CalcPanel, and TypeChartPanel each render their own card chrome
// (`bg-card overflow-hidden rounded-lg shadow-sm`) so they can also be used
// standalone. When mounted inside AnalyticsRail — which provides its own
// chrome on the outer container at a fixed 460px width — we pass these
// neutralizing utility classes to strip the duplicate card styling. The
// panels' `className` is merged into the outer wrapper via `cn()`, so these
// values win against the defaults.
const PANEL_CHROME_OVERRIDE =
  "bg-transparent shadow-none rounded-none flex flex-col flex-1";

// =============================================================================
// AnalyticsRail
// =============================================================================

/**
 * Right-rail tabbed wrapper that hosts the Types, Speed, and Calc panels.
 * Width is responsive: full-width on phones (where the rail stacks below
 * the editor in TeamWorkspace's `grid-cols-1` layout) and pinned to 460px
 * (`w-rail`) at lg+ where the rail sits side-by-side with the editor
 * column in TeamWorkspace's `grid-cols-[minmax(0,1fr)_28.75rem]`. The
 * `sticky top-4` behavior also activates only at lg+ — when stacked,
 * the rail scrolls with the page like any other section.
 *
 * Types is the default tab — it's the most-used analysis tool. Tab state
 * lives on the rail (so switching pokemon does not reset the active tab),
 * while each panel keeps its own internal state and resets via its own
 * `key` strategy on `selectedPokemon` change.
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
  // Computed once and shared between TypeChartPanel and SpeedPanel so the
  // map+filter is not duplicated in the JSX below. Guard against shapes that
  // omit team_pokemon — matches the defensive pattern in CalcPanelInner.
  const filledTeam = (team.team_pokemon ?? [])
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null);

  return (
    <TabsPrimitive.Root
      defaultValue="types"
      data-testid="analytics-rail"
      className={cn(
        // Full width on phones (where the rail stacks below the editor) so it
        // never forces page-level horizontal overflow. Pinned to 460px on lg+
        // when it sits side-by-side with the editor column.
        "bg-card w-full flex-shrink-0 overflow-hidden rounded-lg shadow-sm lg:w-rail",
        // sticky top-4 only at lg+ — when stacked on phones, the rail is just
        // another section of the page and shouldn't pin to the viewport.
        "flex max-h-[calc(100svh-6rem)] flex-col lg:sticky lg:top-4",
        className
      )}
    >
      {/* Tab strip — Base UI primitives used directly so we own all styling. */}
      <TabsPrimitive.List className="bg-muted/50 grid grid-cols-3 border-b">
        {(["types", "speed", "calc"] as const).map((tab) => (
          <TabsPrimitive.Tab
            key={tab}
            value={tab}
            data-testid={`analytics-rail-tab-${tab}`}
            className={cn(
              "text-muted-foreground hover:text-foreground relative cursor-pointer py-2.5 text-center text-xs font-semibold tracking-wide uppercase transition-colors duration-150 outline-none",
              // Active indicator: primary underline flush with the list border-b
              "data-active:text-foreground data-active:after:bg-primary data-active:after:absolute data-active:after:inset-x-0 data-active:after:bottom-0 data-active:after:h-0.5 data-active:after:content-['']"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>

      {/* Panels — Base UI Panel mounts only when active by default. */}
      <TabsPrimitive.Panel
        value="types"
        data-testid="analytics-rail-body-types"
        className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
      >
        <TypeChartPanel team={filledTeam} className={PANEL_CHROME_OVERRIDE} />
      </TabsPrimitive.Panel>

      <TabsPrimitive.Panel
        value="speed"
        data-testid="analytics-rail-body-speed"
        className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
      >
        {selectedPokemon && format ? (
          <SpeedPanel
            selectedPokemon={selectedPokemon}
            team={filledTeam}
            format={format}
            className={PANEL_CHROME_OVERRIDE}
          />
        ) : (
          <SpeedEmpty hasPokemon={selectedPokemon !== null} />
        )}
      </TabsPrimitive.Panel>

      <TabsPrimitive.Panel
        value="calc"
        data-testid="analytics-rail-body-calc"
        className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
      >
        <CalcPanel
          team={team}
          selectedPokemon={selectedPokemon}
          format={format}
          className={PANEL_CHROME_OVERRIDE}
        />
      </TabsPrimitive.Panel>
    </TabsPrimitive.Root>
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
