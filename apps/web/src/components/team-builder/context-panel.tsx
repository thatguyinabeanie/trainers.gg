"use client";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DamageCalcTab } from "./damage-calc-tab";
import { SpeedTierTab } from "./speed-tier-tab";
import { TypeCoverageTab } from "./type-coverage-tab";

// =============================================================================
// Types
// =============================================================================

type ContextTab = "types" | "speed" | "calc";

interface ContextPanelProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  activeTab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
  format?: GameFormat;
}

// =============================================================================
// ContextPanel
// =============================================================================

/**
 * Right-hand panel in the team builder workspace.
 * Shows contextual analysis of the team — type coverage, speed tiers, damage calc.
 */
export function ContextPanel({
  team,
  selectedPokemon,
  activeTab,
  onTabChange,
  format,
}: ContextPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as ContextTab)}
        className="flex h-full flex-col"
      >
        <div className="border-b px-4 pt-3 pb-0">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="speed">Speed</TabsTrigger>
            <TabsTrigger value="calc">Calc</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="types" className="flex-1 overflow-y-auto">
          <TypeCoverageTab team={team} selectedPokemon={selectedPokemon} />
        </TabsContent>

        <TabsContent value="speed" className="flex-1 overflow-y-auto">
          <SpeedTierTab
            team={team}
            selectedPokemon={selectedPokemon}
            format={format}
          />
        </TabsContent>

        <TabsContent value="calc" className="flex-1 overflow-y-auto">
          <DamageCalcTab
            team={team}
            selectedPokemon={selectedPokemon}
            format={format}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
