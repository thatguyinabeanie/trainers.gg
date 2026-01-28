"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PhaseConfig, PhaseType, CutRule } from "@/lib/types/tournament";
import {
  getDefaultPhaseName,
  getDefaultRoundTime,
} from "@/lib/tournament/adapters";
import { Plus, Trash2, HelpCircle } from "lucide-react";

export interface TournamentPhasesEditorProps {
  phases: PhaseConfig[];
  onPhasesChange: (phases: PhaseConfig[]) => void;
  mode: "create" | "edit";
  disabled?: boolean;
  canAddRemove?: boolean;
}

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

function generatePhaseId(): string {
  return `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function BestOfSelector({
  value,
  onChange,
  disabled,
}: {
  value: 1 | 3 | 5;
  onChange: (value: 1 | 3 | 5) => void;
  disabled?: boolean;
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
          disabled={disabled}
        >
          {opt}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export function TournamentPhasesEditor({
  phases,
  onPhasesChange,
  mode: _mode,
  disabled = false,
  canAddRemove = true,
}: TournamentPhasesEditorProps) {
  const handleAddPhase = () => {
    // Default to single_elimination if there's already a swiss phase, otherwise swiss
    const hasSwiss = phases.some((p) => p.phaseType === "swiss");
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

    onPhasesChange([...phases, newPhase]);
  };

  const handleRemovePhase = (phaseId: string) => {
    onPhasesChange(phases.filter((p) => p.id !== phaseId));
  };

  const handleUpdatePhase = (
    phaseId: string,
    updates: Partial<PhaseConfig>
  ) => {
    onPhasesChange(
      phases.map((p) => {
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
      })
    );
  };

  // Check if a phase is preceded by a Swiss phase (for showing cut rule)
  const isPrecededBySwiss = (index: number) => {
    if (index === 0) return false;
    const prevPhase = phases[index - 1];
    return prevPhase?.phaseType === "swiss";
  };

  // Show add phase button when we have no phases or canAddRemove is true
  const showAddButton = canAddRemove && !disabled;
  const showRemoveButton = canAddRemove && !disabled && phases.length > 1;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Tournament Structure</Label>
        <p className="text-muted-foreground text-sm">
          Define the phases players will compete through
        </p>
      </div>

      {/* Phase Flow - Centered with max width */}
      <div className="mx-auto max-w-2xl space-y-3">
        {phases.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No phases configured yet. Add a phase to define your tournament
                structure.
              </p>
              {showAddButton && (
                <Button variant="outline" onClick={handleAddPhase}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phase
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {phases.map((phase, index) => {
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
                {index < phases.length - 1 && (
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
                      disabled={disabled}
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
                      disabled={disabled}
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
                    {showRemoveButton && (
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
                      <Tooltip>
                        <TooltipTrigger className="text-muted-foreground flex cursor-help items-center gap-1 text-sm font-normal">
                          Best of
                          <HelpCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Games needed to win a match (Bo1, Bo3, or Bo5)
                        </TooltipContent>
                      </Tooltip>
                      <BestOfSelector
                        value={phase.bestOf}
                        onChange={(value) =>
                          handleUpdatePhase(phase.id, { bestOf: value })
                        }
                        disabled={disabled}
                      />
                    </div>

                    {/* Swiss: Rounds */}
                    {isSwiss && (
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground flex cursor-help items-center gap-1 text-sm font-normal">
                            Rounds
                            <HelpCircle className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Number of Swiss rounds. Leave empty to
                            auto-calculate based on player count.
                          </TooltipContent>
                        </Tooltip>
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
                          disabled={disabled}
                        />
                      </div>
                    )}

                    {/* Elimination: Cut Rule */}
                    {showCutRule && (
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground flex cursor-help items-center gap-1 text-sm font-normal">
                            Cut
                            <HelpCircle className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Who advances from Swiss to top cut. X-2 means
                            players with 2 or fewer losses.
                          </TooltipContent>
                        </Tooltip>
                        <Select
                          value={phase.cutRule || "x-2"}
                          onValueChange={(value) => {
                            if (value) {
                              handleUpdatePhase(phase.id, {
                                cutRule: value as CutRule,
                              });
                            }
                          }}
                          disabled={disabled}
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
                      <Tooltip>
                        <TooltipTrigger className="text-muted-foreground flex cursor-help items-center gap-1 text-sm font-normal">
                          Timer
                          <HelpCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Round time limit in minutes. Set to 0 to disable.
                        </TooltipContent>
                      </Tooltip>
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
                        disabled={disabled}
                      />
                      <span className="text-muted-foreground text-sm">min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* Add Phase Button */}
        {showAddButton && phases.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
