"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  TournamentFormData,
  PhaseConfig,
  PhaseType,
  MatchFormat,
} from "@/lib/types/tournament";
import { Plus, Trash2, ChevronRight } from "lucide-react";

interface TournamentFormatProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

const formatOptions = [
  "VGC 2025",
  "VGC 2024 Regulation H",
  "VGC 2024 Regulation G",
  "Custom Format",
];

const phaseTypeOptions: { value: PhaseType; label: string }[] = [
  { value: "swiss", label: "Swiss" },
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
];

const matchFormatOptions: { value: MatchFormat; label: string }[] = [
  { value: "best_of_1", label: "Bo1" },
  { value: "best_of_3", label: "Bo3" },
  { value: "best_of_5", label: "Bo5" },
];

const bracketSizeOptions = [
  { value: 4, label: "Top 4" },
  { value: 8, label: "Top 8" },
  { value: 16, label: "Top 16" },
  { value: 32, label: "Top 32" },
];

function generatePhaseId(): string {
  return `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultPhaseName(phaseType: PhaseType): string {
  switch (phaseType) {
    case "swiss":
      return "Swiss Rounds";
    case "single_elimination":
      return "Top Cut";
    case "double_elimination":
      return "Double Elimination";
  }
}

// Derive tournamentFormat from phases for backward compatibility
function deriveTournamentFormat(
  phases: PhaseConfig[]
): TournamentFormData["tournamentFormat"] {
  if (phases.length === 0) return "swiss_only";

  const hasSwiss = phases.some((p) => p.phaseType === "swiss");
  const hasElimination = phases.some(
    (p) =>
      p.phaseType === "single_elimination" ||
      p.phaseType === "double_elimination"
  );
  const hasDoubleElim = phases.some(
    (p) => p.phaseType === "double_elimination"
  );

  if (hasSwiss && hasElimination) return "swiss_with_cut";
  if (hasDoubleElim) return "double_elimination";
  if (hasElimination) return "single_elimination";
  return "swiss_only";
}

export function TournamentFormat({
  formData,
  updateFormData,
}: TournamentFormatProps) {
  const handleAddPhase = () => {
    // Default to single_elimination if there's already a swiss phase, otherwise swiss
    const hasSwiss = formData.phases.some((p) => p.phaseType === "swiss");
    const defaultType: PhaseType = hasSwiss ? "single_elimination" : "swiss";
    const newPhase: PhaseConfig = {
      id: generatePhaseId(),
      name: getDefaultPhaseName(defaultType),
      phaseType: defaultType,
      matchFormat: "best_of_3",
    };

    const updatedPhases = [...formData.phases, newPhase];
    updateFormData({
      phases: updatedPhases,
      tournamentFormat: deriveTournamentFormat(updatedPhases),
    });
  };

  const handleRemovePhase = (phaseId: string) => {
    const updatedPhases = formData.phases.filter((p) => p.id !== phaseId);
    updateFormData({
      phases: updatedPhases,
      tournamentFormat: deriveTournamentFormat(updatedPhases),
    });
  };

  const handleUpdatePhase = (
    phaseId: string,
    updates: Partial<PhaseConfig>
  ) => {
    const updatedPhases = formData.phases.map((p) => {
      if (p.id !== phaseId) return p;

      const updated = { ...p, ...updates };

      // Auto-update name when type changes (if name matches default)
      if (updates.phaseType && p.name === getDefaultPhaseName(p.phaseType)) {
        updated.name = getDefaultPhaseName(updates.phaseType);
      }

      return updated;
    });

    updateFormData({
      phases: updatedPhases,
      tournamentFormat: deriveTournamentFormat(updatedPhases),
    });
  };

  // Check if a phase has a next phase (for showing advancement settings)
  const hasNextPhase = (index: number) => index < formData.phases.length - 1;

  // Check if a phase is preceded by a Swiss phase (for showing bracket size)
  const isPrecededBySwiss = (index: number) => {
    if (index === 0) return false;
    const prevPhase = formData.phases[index - 1];
    return prevPhase?.phaseType === "swiss";
  };

  return (
    <div className="space-y-6">
      {/* Game Format */}
      <div className="space-y-2">
        <Label htmlFor="format">Game Format</Label>
        <Select
          value={formData.format}
          onValueChange={(value) =>
            updateFormData({ format: value || undefined })
          }
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formatOptions.map((format) => (
              <SelectItem key={format} value={format}>
                {format}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Tournament Phases - Visual Flow */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Tournament Phases</Label>
          <p className="text-muted-foreground text-sm">
            Configure the phases players will compete through
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          {formData.phases.map((phase, index) => {
            const isSwiss = phase.phaseType === "swiss";
            const isElimination =
              phase.phaseType === "single_elimination" ||
              phase.phaseType === "double_elimination";
            const showBracketSize = isElimination && isPrecededBySwiss(index);
            const showPlannedRounds = isSwiss;

            return (
              <div key={phase.id} className="flex items-center gap-2">
                {/* Phase Card */}
                <Card className="w-56">
                  <CardContent className="space-y-3 p-3">
                    {/* Phase Number & Delete */}
                    <div className="flex items-center justify-between">
                      <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                        {index + 1}
                      </span>
                      {formData.phases.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-6 w-6"
                          onClick={() => handleRemovePhase(phase.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Phase Name Input */}
                    <Input
                      value={phase.name}
                      onChange={(e) =>
                        handleUpdatePhase(phase.id, { name: e.target.value })
                      }
                      className="h-8 text-sm font-medium"
                      placeholder="Phase name"
                    />

                    {/* Phase Type */}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Type
                      </Label>
                      <Select
                        value={phase.phaseType}
                        onValueChange={(value) => {
                          if (value) {
                            handleUpdatePhase(phase.id, {
                              phaseType: value as PhaseType,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {phaseTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Match Format */}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Match Format
                      </Label>
                      <Select
                        value={phase.matchFormat}
                        onValueChange={(value) => {
                          if (value) {
                            handleUpdatePhase(phase.id, {
                              matchFormat: value as MatchFormat,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {matchFormatOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Swiss: Planned Rounds */}
                    {showPlannedRounds && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          Rounds
                        </Label>
                        <Input
                          type="number"
                          value={phase.plannedRounds || ""}
                          onChange={(e) =>
                            handleUpdatePhase(phase.id, {
                              plannedRounds:
                                parseInt(e.target.value) || undefined,
                            })
                          }
                          placeholder="Auto"
                          className="h-8 text-sm"
                          min={3}
                          max={15}
                        />
                      </div>
                    )}

                    {/* Elimination: Bracket Size (only if preceded by Swiss) */}
                    {showBracketSize && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          Bracket Size
                        </Label>
                        <Select
                          value={phase.bracketSize?.toString() || ""}
                          onValueChange={(value) => {
                            if (value) {
                              handleUpdatePhase(phase.id, {
                                bracketSize: parseInt(value),
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {bracketSizeOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value.toString()}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Arrow to next phase or add button */}
                {(index < formData.phases.length - 1 ||
                  formData.phases.length > 0) && (
                  <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
                )}
              </div>
            );
          })}

          {/* Add Phase Button */}
          <Button
            variant="outline"
            className="h-auto min-h-[200px] w-32 flex-col gap-2 border-dashed"
            onClick={handleAddPhase}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add Phase</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Global Tournament Settings */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxParticipants">Max Participants</Label>
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
          />
          <p className="text-muted-foreground text-sm">
            Leave empty for unlimited registrations
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roundTime">Round Time (minutes) *</Label>
          <Input
            id="roundTime"
            type="number"
            value={formData.roundTimeMinutes}
            onChange={(e) =>
              updateFormData({
                roundTimeMinutes: parseInt(e.target.value) || 50,
              })
            }
            min="15"
            max="120"
          />
        </div>
      </div>

      <Separator />

      {/* Team Requirements */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Team Requirements</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Rental Team Photos</Label>
            <p className="text-muted-foreground text-sm">
              Allow players to submit photos of their rental teams
            </p>
          </div>
          <Switch
            checked={formData.rentalTeamPhotosEnabled}
            onCheckedChange={(checked: boolean) =>
              updateFormData({ rentalTeamPhotosEnabled: checked })
            }
          />
        </div>

        {formData.rentalTeamPhotosEnabled && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Rental Team Photos</Label>
              <p className="text-muted-foreground text-sm">
                Make rental team photos mandatory for registration
              </p>
            </div>
            <Switch
              checked={formData.rentalTeamPhotosRequired}
              onCheckedChange={(checked: boolean) =>
                updateFormData({ rentalTeamPhotosRequired: checked })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
