"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  TournamentFormData,
  PhaseConfig,
  PhaseType,
  CutRule,
} from "@/lib/types/tournament";
import { Plus, Trash2 } from "lucide-react";

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
  { value: "single_elimination", label: "Single Elim" },
  { value: "double_elimination", label: "Double Elim" },
];

const cutRuleOptions: { value: CutRule; label: string }[] = [
  { value: "x-1", label: "X-1" },
  { value: "x-2", label: "X-2" },
  { value: "x-3", label: "X-3" },
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

// Button group for Best Of selection using shadcn components
function BestOfSelector({
  value,
  onChange,
}: {
  value: 1 | 3 | 5;
  onChange: (value: 1 | 3 | 5) => void;
}) {
  const options = [1, 3, 5] as const;

  return (
    <ButtonGroup>
      {options.map((opt) => (
        <Button
          key={opt}
          type="button"
          size="sm"
          variant={value === opt ? "default" : "outline"}
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </ButtonGroup>
  );
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
      <Field>
        <FieldLabel htmlFor="format">Game Format</FieldLabel>
        <Select
          value={formData.format}
          onValueChange={(value) =>
            updateFormData({ format: value || undefined })
          }
        >
          <SelectTrigger id="format" className="w-full max-w-xs">
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
      </Field>

      <Separator />

      {/* Tournament Phases */}
      <div className="space-y-4">
        <div>
          <Label className="text-base">Tournament Structure</Label>
          <p className="text-muted-foreground text-sm">
            Define the phases players will compete through
          </p>
        </div>

        {/* Phase Flow - Centered with max width */}
        <div className="mx-auto max-w-2xl space-y-3">
          {formData.phases.map((phase, index) => {
            const isSwiss = phase.phaseType === "swiss";
            const isElimination =
              phase.phaseType === "single_elimination" ||
              phase.phaseType === "double_elimination";
            const showCutRule = isElimination && isPrecededBySwiss(index);

            return (
              <div key={phase.id} className="flex items-start gap-3">
                {/* Phase Number */}
                <div className="flex flex-col items-center pt-4">
                  <span className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  {index < formData.phases.length - 1 && (
                    <div className="bg-border mt-2 h-12 w-px" />
                  )}
                </div>

                {/* Phase Card */}
                <Card className="flex-1">
                  <CardContent className="p-5">
                    {/* Header Row: Name, Type, Delete */}
                    <div className="flex items-center gap-3">
                      <Input
                        value={phase.name}
                        onChange={(e) =>
                          handleUpdatePhase(phase.id, { name: e.target.value })
                        }
                        className="h-10 flex-1 text-base font-medium"
                        placeholder="Phase name"
                      />
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
                        <SelectTrigger className="h-10 w-40">
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
                      {formData.phases.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-10 w-10 shrink-0"
                          onClick={() => handleRemovePhase(phase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Settings Row */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                      {/* Best Of Toggle */}
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground text-sm font-normal">
                          Best of
                        </Label>
                        <BestOfSelector
                          value={phase.bestOf}
                          onChange={(value) =>
                            handleUpdatePhase(phase.id, { bestOf: value })
                          }
                        />
                      </div>

                      {/* Swiss: Rounds */}
                      {isSwiss && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`${phase.id}-rounds`}
                            className="text-muted-foreground text-sm font-normal"
                          >
                            Rounds
                          </Label>
                          <Input
                            id={`${phase.id}-rounds`}
                            type="number"
                            value={phase.plannedRounds || ""}
                            onChange={(e) =>
                              handleUpdatePhase(phase.id, {
                                plannedRounds:
                                  parseInt(e.target.value) || undefined,
                              })
                            }
                            placeholder="Auto"
                            className="h-8 w-20 text-sm"
                            min={3}
                            max={15}
                          />
                        </div>
                      )}

                      {/* Elimination: Cut Rule */}
                      {showCutRule && (
                        <div className="flex items-center gap-2">
                          <Label className="text-muted-foreground text-sm font-normal">
                            Cut
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
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue />
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
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`${phase.id}-timer`}
                          className="text-muted-foreground text-sm font-normal"
                        >
                          Timer
                        </Label>
                        <Input
                          id={`${phase.id}-timer`}
                          type="number"
                          value={phase.roundTimeMinutes || ""}
                          onChange={(e) =>
                            handleUpdatePhase(phase.id, {
                              roundTimeMinutes: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="Off"
                          className="h-8 w-16 text-sm"
                          min={0}
                          max={120}
                        />
                        <Label className="text-muted-foreground text-sm font-normal">
                          min
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Add Phase Button */}
          <div className="flex items-start gap-3">
            <div className="w-7" /> {/* Spacer for alignment */}
            <Button
              variant="outline"
              className="border-dashed"
              onClick={handleAddPhase}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Phase
            </Button>
          </div>
        </div>
      </div>

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
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Team Requirements</h3>

        <Field orientation="horizontal">
          <Switch
            id="rentalTeamPhotosEnabled"
            checked={formData.rentalTeamPhotosEnabled}
            onCheckedChange={(checked: boolean) =>
              updateFormData({ rentalTeamPhotosEnabled: checked })
            }
          />
          <FieldLabel htmlFor="rentalTeamPhotosEnabled">
            Enable Rental Team Photos
            <FieldDescription>
              Allow players to submit photos of their rental teams
            </FieldDescription>
          </FieldLabel>
        </Field>

        {formData.rentalTeamPhotosEnabled && (
          <Field orientation="horizontal">
            <Switch
              id="rentalTeamPhotosRequired"
              checked={formData.rentalTeamPhotosRequired}
              onCheckedChange={(checked: boolean) =>
                updateFormData({ rentalTeamPhotosRequired: checked })
              }
            />
            <FieldLabel htmlFor="rentalTeamPhotosRequired">
              Require Rental Team Photos
              <FieldDescription>
                Make rental team photos mandatory for registration
              </FieldDescription>
            </FieldLabel>
          </Field>
        )}
      </div>
    </div>
  );
}
