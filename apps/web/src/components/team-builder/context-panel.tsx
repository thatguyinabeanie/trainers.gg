"use client";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// =============================================================================
// Types
// =============================================================================

type ContextTab = "types" | "speed" | "calc";

interface ContextPanelProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  activeTab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
}

// =============================================================================
// ContextPanel
// =============================================================================

/**
 * Right-hand panel in the team builder workspace.
 * Shows contextual analysis of the team — type coverage, speed tiers, damage calc.
 *
 * Session 3+ will wire in real tab content; stubs now.
 */
export function ContextPanel({
  team: _team,
  selectedPokemon: _selectedPokemon,
  activeTab,
  onTabChange,
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

        {/* Stub content for each tab */}
        <TabsContent
          value="types"
          className={cn("flex flex-1 items-center justify-center p-6")}
        >
          <StubMessage label="Type coverage" />
        </TabsContent>

        <TabsContent
          value="speed"
          className={cn("flex flex-1 items-center justify-center p-6")}
        >
          <StubMessage label="Speed tiers" />
        </TabsContent>

        <TabsContent
          value="calc"
          className={cn("flex flex-1 items-center justify-center p-6")}
        >
          <StubMessage label="Damage calculator" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// StubMessage — placeholder shown until real tab content is implemented
// =============================================================================

function StubMessage({ label }: { label: string }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="text-muted-foreground mt-1 text-xs">Coming in Session 3</p>
    </div>
  );
}
