"use client";

import { type GameFormat } from "@trainers/pokemon";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { RolePresetsPanel } from "./role-presets-panel";
import { type RoleId } from "./role-registry";
import { type SpeciesFilterState } from "./species-filter-state";
import { SpeciesSidebar } from "./species-sidebar";

interface SpeciesFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
  /** Matches RolePresetsPanel's prop shape exactly — (roleId) => count */
  bucketCount: (roleId: RoleId) => number;
  matchedCount: number;
  onClearAll: () => void;
}

export function SpeciesFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  format,
  currentTeam,
  bucketCount,
  matchedCount,
  onClearAll,
}: SpeciesFilterSheetProps) {
  function handleClearAll() {
    onClearAll();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 p-0"
      >
        <SheetHeader className="border-border flex shrink-0 flex-row items-center justify-between border-b px-4 py-3 text-left">
          <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
          >
            Clear all
          </button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SpeciesSidebar
            filters={filters}
            onFiltersChange={onFiltersChange}
            format={format}
            currentTeam={currentTeam}
          />
          <RolePresetsPanel
            selected={filters.roles}
            onChange={(next) => onFiltersChange({ ...filters, roles: next })}
            bucketCount={bucketCount}
          />
        </div>

        <div className="border-border shrink-0 border-t p-3">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Show {matchedCount} results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
