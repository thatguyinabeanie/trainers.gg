"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
 * Right-rail tabbed wrapper that hosts the Types, Speed, and Calc panels at a
 * fixed 460px width. Types is the default tab — it's the most-used analysis
 * tool. Tab state lives on the rail (so switching pokemon does not reset the
 * active tab), while each panel keeps its own internal state and resets via
 * its own `key` strategy on `selectedPokemon` change.
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
  return (
    <Tabs
      defaultValue="types"
      data-testid="analytics-rail"
      className={cn(
        "bg-card w-rail flex-shrink-0 overflow-hidden rounded-lg shadow-sm",
        "sticky top-4 flex max-h-[calc(100svh-2rem)] flex-col",
        className
      )}
    >
      <TabsList
        variant="line"
        className="bg-muted/50 grid h-auto w-full grid-cols-3 rounded-none border-b px-0 py-0"
      >
        <TabsTrigger
          value="types"
          className="rounded-none py-2.5 text-xs font-semibold tracking-wide uppercase"
        >
          Types
        </TabsTrigger>
        <TabsTrigger
          value="speed"
          className="rounded-none py-2.5 text-xs font-semibold tracking-wide uppercase"
        >
          Speed
        </TabsTrigger>
        <TabsTrigger
          value="calc"
          className="rounded-none py-2.5 text-xs font-semibold tracking-wide uppercase"
        >
          Calc
        </TabsTrigger>
      </TabsList>

      {/* Body — only the active panel is mounted (keepMounted defaults to false) */}
      <TabsContent
        value="types"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TypeChartPanel
          team={team.team_pokemon
            .map((tp) => tp.pokemon)
            .filter((p): p is Tables<"pokemon"> => p !== null)}
          className={PANEL_CHROME_OVERRIDE}
        />
      </TabsContent>

      <TabsContent
        value="speed"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
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
      </TabsContent>

      <TabsContent
        value="calc"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <CalcPanel
          team={team}
          selectedPokemon={selectedPokemon}
          format={format}
          className={PANEL_CHROME_OVERRIDE}
        />
      </TabsContent>
    </Tabs>
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
