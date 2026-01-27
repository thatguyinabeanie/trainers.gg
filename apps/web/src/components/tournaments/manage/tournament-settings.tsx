"use client";

import { useState } from "react";
import { useSupabaseMutation } from "@/lib/supabase";
import { updateTournament, deleteTournament } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Save, AlertTriangle, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updatePhase } from "@/actions/tournaments";

interface Phase {
  id: number;
  tournament_id: number;
  name: string;
  phase_order: number;
  phase_type: string;
  best_of: number | null;
  round_time_minutes: number | null;
  check_in_time_minutes: number | null;
  cut_rule: string | null;
  planned_rounds: number | null;
  status: string | null;
}

interface TournamentSettingsProps {
  tournament: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    status: string;
    format: string | null;
    max_participants?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    registration_deadline?: string | null;
    round_time_minutes?: number | null;
    rental_team_photos_enabled?: boolean | null;
    rental_team_photos_required?: boolean | null;
  };
  phases?: Phase[];
}

export function TournamentSettings({
  tournament,
  phases = [],
}: TournamentSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [updatingPhaseId, setUpdatingPhaseId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: tournament.name || "",
    description: tournament.description || "",
    format: tournament.format || "",
    maxParticipants: tournament.max_participants?.toString() || "",
    roundTimeMinutes: tournament.round_time_minutes || 50,
    rentalTeamPhotosEnabled: tournament.rental_team_photos_enabled || false,
    rentalTeamPhotosRequired: tournament.rental_team_photos_required || false,
  });

  const { mutateAsync: updateTournamentMutation } = useSupabaseMutation(
    (
      supabase,
      args: {
        tournamentId: number;
        updates: {
          name?: string;
          description?: string;
          format?: string;
        };
      }
    ) => updateTournament(supabase, args.tournamentId, args.updates)
  );

  const { mutateAsync: deleteTournamentMutation } = useSupabaseMutation(
    (supabase, args: { tournamentId: number }) =>
      deleteTournament(supabase, args.tournamentId)
  );

  const handleSave = async () => {
    try {
      await updateTournamentMutation({
        tournamentId: tournament.id,
        updates: {
          name: formData.name,
          description: formData.description,
          format: formData.format,
        },
      });

      toast.success("Settings saved", {
        description: "Tournament settings have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Error saving settings", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this tournament? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteTournamentMutation({ tournamentId: tournament.id });
      toast.success("Tournament deleted", {
        description: "The tournament has been permanently deleted.",
      });
      // Redirect to tournaments list
      window.location.href = "/tournaments";
    } catch (error) {
      toast.error("Error deleting tournament", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const canEdit =
    tournament.status === "draft" || tournament.status === "upcoming";
  const canDelete = tournament.status === "draft";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tournament Settings</h2>
          <p className="text-muted-foreground">
            Configure tournament details and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} disabled={!canEdit}>
              Edit Settings
            </Button>
          )}
        </div>
      </div>

      {!canEdit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tournament settings can only be edited when the tournament is in
            draft or upcoming status.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Tournament name, description, and basic details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              disabled={!isEditing}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Game Format</Label>
            <Input
              id="format"
              value={formData.format}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, format: e.target.value }))
              }
              disabled={!isEditing}
              placeholder="e.g., VGC 2024 Regulation H"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tournament Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Configuration</CardTitle>
          <CardDescription>
            Participant limits, timing, and format settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxParticipants: e.target.value,
                  }))
                }
                disabled={!isEditing}
                placeholder="No limit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roundTime">Round Time (minutes)</Label>
              <Input
                id="roundTime"
                type="number"
                value={formData.roundTimeMinutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    roundTimeMinutes: parseInt(e.target.value),
                  }))
                }
                disabled={!isEditing}
                min="15"
                max="120"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Configuration */}
      {phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Phase Configuration
            </CardTitle>
            <CardDescription>
              Configure match format for each tournament phase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {phases.map((phase) => {
              const currentBestOf = phase.best_of?.toString() || "3";
              const isUpdating = updatingPhaseId === phase.id;

              const handleBestOfChange = async (value: string) => {
                if (!canEdit || isUpdating) return;

                setUpdatingPhaseId(phase.id);
                try {
                  const result = await updatePhase(phase.id, tournament.id, {
                    bestOf: parseInt(value) as 1 | 3 | 5,
                  });

                  if (result.success) {
                    toast.success("Phase updated", {
                      description: `${phase.name} match format updated to Best of ${value}`,
                    });
                  } else {
                    toast.error("Error updating phase", {
                      description: result.error,
                    });
                  }
                } catch (error) {
                  toast.error("Error updating phase", {
                    description:
                      error instanceof Error
                        ? error.message
                        : "An unexpected error occurred",
                  });
                } finally {
                  setUpdatingPhaseId(null);
                }
              };

              return (
                <div key={phase.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{phase.name}</h4>
                      <p className="text-muted-foreground text-sm capitalize">
                        {phase.phase_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">
                      Best Of
                    </Label>
                    <RadioGroup
                      value={currentBestOf}
                      onValueChange={handleBestOfChange}
                      disabled={!canEdit || isUpdating}
                      className="flex gap-6"
                    >
                      {[
                        { value: "1", label: "1" },
                        { value: "3", label: "3" },
                        { value: "5", label: "5" },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`${phase.id}-${option.value}`}
                            disabled={!canEdit || isUpdating}
                          />
                          <Label
                            htmlFor={`${phase.id}-${option.value}`}
                            className={
                              !canEdit || isUpdating
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer"
                            }
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  {phase !== phases[phases.length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Team Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Team Requirements</CardTitle>
          <CardDescription>
            Configure team submission and verification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                setFormData((prev) => ({
                  ...prev,
                  rentalTeamPhotosEnabled: checked,
                }))
              }
              disabled={!isEditing}
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
                  setFormData((prev) => ({
                    ...prev,
                    rentalTeamPhotosRequired: checked,
                  }))
                }
                disabled={!isEditing}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {canDelete && (
        <>
          <Separator />
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect this
                tournament
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Delete Tournament</h4>
                  <p className="text-muted-foreground text-sm">
                    Permanently delete this tournament and all associated data
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tournament
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
