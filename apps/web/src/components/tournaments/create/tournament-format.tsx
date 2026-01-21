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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TournamentFormData } from "@/lib/types/tournament";

interface TournamentFormatProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

const formatOptions = [
  "VGC 2024 Regulation H",
  "VGC 2024 Regulation G",
  "VGC 2023 Regulation E",
  "Custom Format",
];

const tournamentFormatOptions = [
  {
    value: "swiss_only",
    label: "Swiss Only",
    description: "Swiss rounds with final standings",
  },
  {
    value: "swiss_with_cut",
    label: "Swiss + Top Cut",
    description: "Swiss rounds followed by elimination bracket",
  },
  {
    value: "single_elimination",
    label: "Single Elimination",
    description: "Direct elimination bracket",
  },
  {
    value: "double_elimination",
    label: "Double Elimination",
    description: "Elimination with losers bracket",
  },
];

export function TournamentFormat({
  formData,
  updateFormData,
}: TournamentFormatProps) {
  const showSwissOptions =
    formData.tournamentFormat === "swiss_only" ||
    formData.tournamentFormat === "swiss_with_cut";
  const showTopCut = formData.tournamentFormat === "swiss_with_cut";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="format">Game Format</Label>
        <Select
          value={formData.format}
          onValueChange={(value) =>
            updateFormData({ format: value || undefined })
          }
        >
          <SelectTrigger>
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

      <div className="space-y-2">
        <Label>Tournament Structure *</Label>
        <div className="grid gap-3">
          {tournamentFormatOptions.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-colors ${
                formData.tournamentFormat === option.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() =>
                updateFormData({
                  tournamentFormat: option.value as
                    | "swiss_only"
                    | "swiss_with_cut"
                    | "single_elimination"
                    | "double_elimination",
                })
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      formData.tournamentFormat === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                  <CardTitle className="text-base">{option.label}</CardTitle>
                </div>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

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
            placeholder="32"
            min="4"
            max="512"
          />
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

      {showSwissOptions && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="swissRounds">Swiss Rounds</Label>
            <Input
              id="swissRounds"
              type="number"
              value={formData.swissRounds || ""}
              onChange={(e) =>
                updateFormData({
                  swissRounds: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="5"
              min="3"
              max="10"
            />
            <p className="text-muted-foreground text-sm">
              Leave empty for auto-calculation based on participants
            </p>
          </div>

          {showTopCut && (
            <div className="space-y-2">
              <Label htmlFor="topCutSize">Top Cut Size</Label>
              <Select
                value={formData.topCutSize?.toString()}
                onValueChange={(value) =>
                  updateFormData({
                    topCutSize: value ? parseInt(value) : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Top 4</SelectItem>
                  <SelectItem value="8">Top 8</SelectItem>
                  <SelectItem value="16">Top 16</SelectItem>
                  <SelectItem value="32">Top 32</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

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
            onCheckedChange={(checked) =>
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
              onCheckedChange={(checked) =>
                updateFormData({ rentalTeamPhotosRequired: checked })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
