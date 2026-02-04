"use client";

import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import type {
  PhaseConfig,
  TournamentPreset,
} from "@trainers/tournaments/types";
import {
  TOURNAMENT_PRESETS,
  type PresetConfig,
  applyPreset,
  detectActivePreset,
} from "./tournament-presets";

export interface TournamentPresetSelectorProps {
  /**
   * Current phases to detect active preset
   */
  phases: PhaseConfig[];
  /**
   * Called when a preset is selected with the new phases
   */
  onPresetSelect: (phases: PhaseConfig[], presetId: TournamentPreset) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
  /**
   * Optional label override (default: "Quick start:")
   */
  label?: string;
}

export function TournamentPresetSelector({
  phases,
  onPresetSelect,
  disabled = false,
  label = "Quick start:",
}: TournamentPresetSelectorProps) {
  const activePreset = detectActivePreset(phases);

  const handlePresetSelect = (preset: PresetConfig) => {
    const newPhases = applyPreset(preset);
    onPresetSelect(newPhases, preset.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground flex items-center gap-1 text-sm">
        <Zap className="h-3.5 w-3.5" />
        {label}
      </span>
      {TOURNAMENT_PRESETS.map((preset) => {
        const isActive = activePreset === preset.id;
        return (
          <Button
            key={preset.id}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetSelect(preset)}
            disabled={disabled}
          >
            {preset.name}
          </Button>
        );
      })}
    </div>
  );
}
