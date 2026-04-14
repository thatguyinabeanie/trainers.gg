"use client";

import { X } from "lucide-react";

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
  onClose: () => void;
  format?: GameFormat;
}

// =============================================================================
// ContextPanel
// =============================================================================

/**
 * Right-hand panel in the team builder workspace.
 * Shows contextual analysis of the team — type coverage, speed tiers, damage calc.
 * Includes a close button to collapse the panel and free editor space.
 */
export function ContextPanel({
  team,
  selectedPokemon,
  activeTab,
  onTabChange,
  onClose,
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
        {/* Header — relative so close button can be absolutely positioned */}
        <div className="relative border-b px-3 pt-3 pb-0 md:px-4">
          <div className="flex justify-center">
            <TabsList variant="line" className="overflow-x-auto">
              <TabsTrigger value="types">Types</TabsTrigger>
              <TabsTrigger value="speed">Speed</TabsTrigger>
              <TabsTrigger value="calc">Calc</TabsTrigger>
            </TabsList>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close context panel"
            className="text-muted-foreground hover:text-foreground absolute top-2 right-3 flex size-7 items-center justify-center rounded transition-colors md:right-4"
          >
            <X className="size-4" />
          </button>
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
