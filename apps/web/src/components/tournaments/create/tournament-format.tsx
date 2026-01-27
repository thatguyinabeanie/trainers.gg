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
  CutRule,
} from "@/lib/types/tournament";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, ChevronRight, HelpCircle } from "lucide-react";

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

const bestOfOptions: { value: 1 | 3 | 5; label: string }[] = [
  { value: 1, label: "Bo1" },
  { value: 3, label: "Bo3" },
  { value: 5, label: "Bo5" },
];

const cutRuleOptions: { value: CutRule; label: string }[] = [
  { value: "x-1", label: "X-1 (≤1 loss)" },
  { value: "x-2", label: "X-2 (≤2 losses)" },
  { value: "x-3", label: "X-3 (≤3 losses)" },
  { value: "top-4", label: "Top 4" },
  { value: "top-8", label: "Top 8" },
  { value: "top-16", label: "Top 16" },
  { value: "top-32", label: "Top 32" },
];

/**
 * Get default round time based on best of format
 * VGC: 20 min/game + 5 min/game buffer
 */
function getDefaultRoundTime(bestOf: 1 | 3 | 5): number {
  switch (bestOf) {
    case 1:
      return 25;
    case 3:
      return 50;
    case 5:
      return 75;
  }
}

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
    const defaultBestOf = 3 as const;

    const newPhase: PhaseConfig = {
      id: generatePhaseId(),
      name: getDefaultPhaseName(defaultType),
      phaseType: defaultType,
      bestOf: defaultBestOf,
      roundTimeMinutes: getDefaultRoundTime(defaultBestOf),
      checkInTimeMinutes: 5,
      // If adding elimination after swiss, default to x-2
      cutRule:
        defaultType !== "swiss" && hasSwiss ? ("x-2" as CutRule) : undefined,
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

      // Auto-update round time when bestOf changes
      if (
        updates.bestOf &&
        p.roundTimeMinutes === getDefaultRoundTime(p.bestOf)
      ) {
        updated.roundTimeMinutes = getDefaultRoundTime(updates.bestOf);
      }

      return updated;
    });

    updateFormData({
      phases: updatedPhases,
      tournamentFormat: deriveTournamentFormat(updatedPhases),
    });
  };

  // Check if a phase is preceded by a Swiss phase (for showing cut rule)
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
            const showCutRule = isElimination && isPrecededBySwiss(index);
            const showPlannedRounds = isSwiss;

            return (
              <div key={phase.id} className="flex items-center gap-2">
                {/* Phase Card */}
                <Card className="w-64">
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

                    {/* Best Of */}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Best Of
                      </Label>
                      <Select
                        value={phase.bestOf.toString()}
                        onValueChange={(value) => {
                          if (value) {
                            handleUpdatePhase(phase.id, {
                              bestOf: parseInt(value) as 1 | 3 | 5,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bestOfOptions.map((option) => (
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

                    {/* Elimination: Cut Rule (only if preceded by Swiss) */}
                    {showCutRule && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          Qualification
                        </Label>
                        <Select
                          value={phase.cutRule || "x-2"}
                          onValueChange={(value) => {
                            if (value) {
                              handleUpdatePhase(phase.id, {
                                cutRule: value as CutRule,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {cutRuleOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Round Timer */}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Round Timer (min)
                      </Label>
                      <Input
                        type="number"
                        value={phase.roundTimeMinutes || ""}
                        onChange={(e) =>
                          handleUpdatePhase(phase.id, {
                            roundTimeMinutes: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0 = no timer"
                        className="h-8 text-sm"
                        min={0}
                        max={120}
                      />
                    </div>

                    {/* Check-in Timer */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Label className="text-muted-foreground text-xs">
                          Check-in Timer (min/game)
                        </Label>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground cursor-help">
                            <HelpCircle className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Handles no-shows after a round starts. If a player
                            doesn&apos;t show up, they automatically lose one
                            game per interval until the match is forfeited.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        type="number"
                        value={phase.checkInTimeMinutes || ""}
                        onChange={(e) =>
                          handleUpdatePhase(phase.id, {
                            checkInTimeMinutes: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0 = disabled"
                        className="h-8 text-sm"
                        min={0}
                        max={30}
                      />
                    </div>
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
            className="h-auto min-h-[300px] w-32 flex-col gap-2 border-dashed"
            onClick={handleAddPhase}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add Phase</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Global Tournament Settings */}
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
          className="w-full max-w-xs"
        />
        <p className="text-muted-foreground text-sm">
          Leave empty for unlimited registrations
        </p>
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
