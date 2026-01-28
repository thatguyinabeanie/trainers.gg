"use client";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import type { TournamentFormData, PhaseConfig } from "@/lib/types/tournament";
import {
  TournamentPhasesEditor,
  TournamentTeamRequirements,
  TournamentGameFormat,
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
      {/* Game Format */}
      <TournamentGameFormat
        value={formData.format}
        onChange={(value) => updateFormData({ format: value })}
      />

      <Separator />

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

      <Separator />

      {/* Global Tournament Settings */}
      <Field>
        <FieldLabel htmlFor="maxParticipants">Max Participants</FieldLabel>
        <Input
          id="maxParticipants"
          type="number"
          value={formData.maxParticipants || ""}
          onChange={(e) =>
            updateFormData({
              maxParticipants: parseInt(e.target.value) || undefined,
            })
          }
          placeholder="Unlimited"
          min="4"
          max="512"
          className="w-full max-w-xs"
        />
        <FieldDescription>
          Leave empty for unlimited registrations
        </FieldDescription>
      </Field>

      <Separator />

      {/* Team Requirements */}
      <TournamentTeamRequirements
        rentalTeamPhotosEnabled={formData.rentalTeamPhotosEnabled}
        rentalTeamPhotosRequired={formData.rentalTeamPhotosRequired}
        onChange={(updates) => updateFormData(updates)}
      />
    </div>
  );
}
