"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseMutation } from "@/lib/supabase";
import { updateTournament, deleteTournament } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { saveTournamentPhasesAction } from "@/actions/tournaments";
import type { PhaseConfig, CutRule } from "@/lib/types/tournament";
import { dbPhasesToPhaseConfigs } from "@/lib/tournament/adapters";
import {
  TournamentPhasesEditor,
  TournamentTeamRequirements,
  TournamentGameFormat,
  TournamentPresetSelector,
} from "../shared";

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
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  current_round: number | null;
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
  phases: initialPhases = [],
}: TournamentSettingsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state - all changes are local until Save is clicked
  const [formData, setFormData] = useState({
    name: tournament.name || "",
    description: tournament.description || "",
    format: tournament.format || "",
    maxParticipants: tournament.max_participants?.toString() || "",
    roundTimeMinutes: tournament.round_time_minutes || 50,
    rentalTeamPhotosEnabled: tournament.rental_team_photos_enabled || false,
    rentalTeamPhotosRequired: tournament.rental_team_photos_required || false,
  });

  // Phase state - local until Save is clicked
  const [phaseConfigs, setPhaseConfigs] = useState<PhaseConfig[]>(() =>
    dbPhasesToPhaseConfigs(initialPhases)
  );

  // Store original phases for comparison
  const [originalPhases] = useState<Phase[]>(initialPhases);

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

  // Convert PhaseConfig to the format expected by the server action
  const convertPhasesForSave = (phases: PhaseConfig[]) => {
    return phases.map((phase) => ({
      // Extract DB ID if it exists (format: "db-123")
      id: phase.id.startsWith("db-")
        ? parseInt(phase.id.replace("db-", ""), 10)
        : undefined,
      name: phase.name,
      phaseType: phase.phaseType,
      bestOf: phase.bestOf,
      roundTimeMinutes: phase.roundTimeMinutes,
      checkInTimeMinutes: phase.checkInTimeMinutes,
      plannedRounds: phase.plannedRounds,
      cutRule: phase.cutRule as CutRule | undefined,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save tournament settings
      await updateTournamentMutation({
        tournamentId: tournament.id,
        updates: {
          name: formData.name,
          description: formData.description,
          format: formData.format,
        },
      });

      // Save phases in a single batch operation
      const phasesForSave = convertPhasesForSave(phaseConfigs);
      const phasesResult = await saveTournamentPhasesAction(
        tournament.id,
        phasesForSave
      );

      if (!phasesResult.success) {
        toast.error("Error saving phases", {
          description: phasesResult.error,
        });
        return;
      }

      toast.success("Settings saved", {
        description: "Tournament settings have been updated successfully.",
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error("Error saving settings", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: tournament.name || "",
      description: tournament.description || "",
      format: tournament.format || "",
      maxParticipants: tournament.max_participants?.toString() || "",
      roundTimeMinutes: tournament.round_time_minutes || 50,
      rentalTeamPhotosEnabled: tournament.rental_team_photos_enabled || false,
      rentalTeamPhotosRequired: tournament.rental_team_photos_required || false,
    });
    // Reset phases to original
    setPhaseConfigs(dbPhasesToPhaseConfigs(originalPhases));
    setIsEditing(false);
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

  // Handle phase changes - just update local state, no API calls
  const handlePhasesChange = (newPhases: PhaseConfig[]) => {
    setPhaseConfigs(newPhases);
  };

  const canEdit =
    tournament.status === "draft" || tournament.status === "upcoming";
  const canDelete = tournament.status === "draft";
  // Allow adding/removing phases only when actively editing
  const canAddRemovePhases = isEditing && canEdit;

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
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
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

          <TournamentGameFormat
            value={formData.format || undefined}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, format: value || "" }))
            }
            disabled={!isEditing}
          />
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

      {/* Phase Configuration - Using shared component */}
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
        <CardContent className="space-y-4">
          {/* Preset selector - always visible, disabled when not editing */}
          <TournamentPresetSelector
            phases={phaseConfigs}
            onPresetSelect={(phases) => handlePhasesChange(phases)}
            label="Apply preset:"
            disabled={!canAddRemovePhases}
          />

          <TournamentPhasesEditor
            phases={phaseConfigs}
            onPhasesChange={handlePhasesChange}
            mode="edit"
            disabled={!isEditing}
            canAddRemove={canAddRemovePhases}
          />
        </CardContent>
      </Card>

      {/* Team Requirements - Using shared component */}
      <Card>
        <CardHeader>
          <CardTitle>Team Requirements</CardTitle>
          <CardDescription>
            Configure team submission and verification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TournamentTeamRequirements
            rentalTeamPhotosEnabled={formData.rentalTeamPhotosEnabled}
            rentalTeamPhotosRequired={formData.rentalTeamPhotosRequired}
            onChange={(updates) =>
              setFormData((prev) => ({ ...prev, ...updates }))
            }
            disabled={!isEditing}
          />
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
