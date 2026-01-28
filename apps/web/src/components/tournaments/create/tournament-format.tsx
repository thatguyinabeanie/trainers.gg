"use client";

import type { TournamentFormData, PhaseConfig } from "@/lib/types/tournament";
import {
  TournamentPhasesEditor,
  TournamentPresetSelector,
  deriveTournamentFormat,
} from "../shared";

interface TournamentFormatProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

export function TournamentFormat({
  formData,
  updateFormData,
}: TournamentFormatProps) {
  const handlePhasesChange = (phases: PhaseConfig[]) => {
    updateFormData({
      phases,
      tournamentFormat: deriveTournamentFormat(phases),
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <TournamentPresetSelector
        phases={formData.phases}
        onPresetSelect={(phases, presetId) => {
          updateFormData({
            preset: presetId,
            phases,
            tournamentFormat: deriveTournamentFormat(phases),
          });
        }}
      />

      {/* Tournament Phases */}
      <TournamentPhasesEditor
        phases={formData.phases}
        onPhasesChange={handlePhasesChange}
        mode="create"
        canAddRemove={true}
      />
    </div>
  );
}
