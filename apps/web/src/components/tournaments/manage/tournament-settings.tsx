"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  AlertTriangle,
  Trash2,
  Layers,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "sonner";
import {
  saveTournamentPhasesAction,
  updateTournament as updateTournamentAction,
  deleteTournament as deleteTournamentAction,
} from "@/actions/tournaments";
import type { PhaseConfig, CutRule } from "@trainers/tournaments/types";
import { dbPhasesToPhaseConfigs } from "@trainers/tournaments/adapters";
import {
  TournamentPhasesEditor,
  TournamentGameSettings,
  TournamentPresetSelector,
  type BattlePlatform,
  type BattleFormat,
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

// DateTimeField is imported from the shared UI component
// It supports both timestamp and ISO string output via the outputFormat prop

interface FormData {
  name: string;
  description: string;
  game: string;
  gameFormat: string;
  platform: BattlePlatform;
  battleFormat: BattleFormat;
  maxParticipants: string;
  playerCapEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  registrationType: "open" | "invite_only";
  checkInRequired: boolean;
  allowLateRegistration: boolean;
  lateCheckInMaxRound: number | undefined;
}

interface TournamentSettingsProps {
  tournament: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    status: string;
    game?: string | null;
    game_format?: string | null;
    platform?: string | null;
    battle_format?: string | null;
    max_participants?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    round_time_minutes?: number | null;
    // Registration settings
    registration_type?: string | null;
    check_in_required?: boolean | null;
    allow_late_registration?: boolean | null;
    late_check_in_max_round?: number | null;
  };
  phases?: Phase[];
  /** Used as the post-delete redirect target; falls back to /tournaments. */
  communitySlug?: string;
}

function buildFormDataFromTournament(
  tournament: TournamentSettingsProps["tournament"]
): FormData {
  return {
    name: tournament.name || "",
    description: tournament.description || "",
    game: tournament.game || "sv",
    gameFormat: tournament.game_format || "reg-i",
    platform: (tournament.platform as BattlePlatform) || "cartridge",
    battleFormat: (tournament.battle_format as BattleFormat) || "doubles",
    maxParticipants: tournament.max_participants?.toString() || "",
    playerCapEnabled: tournament.max_participants !== null,
    startDate: tournament.start_date ?? null,
    endDate: tournament.end_date ?? null,
    registrationType:
      (tournament.registration_type as "open" | "invite_only") || "open",
    checkInRequired: tournament.check_in_required ?? false,
    allowLateRegistration: tournament.allow_late_registration ?? false,
    lateCheckInMaxRound: tournament.late_check_in_max_round ?? undefined,
  };
}

export function TournamentSettings({
  tournament,
  phases: initialPhases = [],
  communitySlug,
}: TournamentSettingsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Two snapshots:
  // - `formData` is the live editing state.
  // - `savedFormData` mirrors what's actually persisted; it advances after every
  //   successful save. Cancel resets `formData` to `savedFormData`, and the
  //   diff between them tells us which fields to send (so we never silently
  //   overwrite a null DB value with a UI-default like "sv"/"reg-i").
  const [formData, setFormData] = useState<FormData>(() =>
    buildFormDataFromTournament(tournament)
  );
  const [savedFormData, setSavedFormData] = useState<FormData>(() =>
    buildFormDataFromTournament(tournament)
  );

  const [phaseConfigs, setPhaseConfigs] = useState<PhaseConfig[]>(() =>
    dbPhasesToPhaseConfigs(initialPhases)
  );
  const [savedPhaseConfigs, setSavedPhaseConfigs] = useState<PhaseConfig[]>(
    () => dbPhasesToPhaseConfigs(initialPhases)
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

  // Build an updates payload containing only fields that have changed since the
  // last successful save. Skipping unchanged fields prevents silently writing
  // form-level defaults (e.g., "sv") to columns that are null in the database.
  const buildUpdatePayload = (next: FormData, prev: FormData) => {
    const updates: Parameters<typeof updateTournamentAction>[1] = {};

    if (next.name !== prev.name) updates.name = next.name;
    if (next.description !== prev.description)
      updates.description = next.description;
    if (next.game !== prev.game) updates.game = next.game;
    if (next.gameFormat !== prev.gameFormat)
      updates.gameFormat = next.gameFormat;
    if (next.platform !== prev.platform) updates.platform = next.platform;
    if (next.battleFormat !== prev.battleFormat)
      updates.battleFormat = next.battleFormat;
    if (next.startDate !== prev.startDate) updates.startDate = next.startDate;
    if (next.endDate !== prev.endDate) updates.endDate = next.endDate;

    const nextCap = next.playerCapEnabled
      ? parseInt(next.maxParticipants, 10) || null
      : null;
    const prevCap = prev.playerCapEnabled
      ? parseInt(prev.maxParticipants, 10) || null
      : null;
    if (nextCap !== prevCap) updates.maxParticipants = nextCap;

    if (next.registrationType !== prev.registrationType)
      updates.registrationType = next.registrationType;
    if (next.checkInRequired !== prev.checkInRequired)
      updates.checkInRequired = next.checkInRequired;
    if (next.allowLateRegistration !== prev.allowLateRegistration)
      updates.allowLateRegistration = next.allowLateRegistration;

    const nextLateRound = next.allowLateRegistration
      ? (next.lateCheckInMaxRound ?? null)
      : null;
    const prevLateRound = prev.allowLateRegistration
      ? (prev.lateCheckInMaxRound ?? null)
      : null;
    if (nextLateRound !== prevLateRound)
      updates.lateCheckInMaxRound = nextLateRound;

    return updates;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates = buildUpdatePayload(formData, savedFormData);

      if (Object.keys(updates).length > 0) {
        const result = await updateTournamentAction(tournament.id, updates);
        if (!result.success) {
          toast.error("Error saving settings", { description: result.error });
          return;
        }
      }

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

      // Advance the saved snapshots so a follow-up edit + cancel reverts to
      // the just-saved values, not the stale prop.
      setSavedFormData(formData);
      setSavedPhaseConfigs(phaseConfigs);
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
    setFormData(savedFormData);
    setPhaseConfigs(savedPhaseConfigs);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTournamentAction(tournament.id);
      if (!result.success) {
        toast.error("Error deleting tournament", { description: result.error });
        return;
      }
      toast.success("Tournament deleted", {
        description: "The tournament has been permanently deleted.",
      });
      router.push(
        communitySlug
          ? `/dashboard/community/${communitySlug}/tournaments`
          : "/tournaments"
      );
    } catch (error) {
      toast.error("Error deleting tournament", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle phase changes - just update local state, no API calls
  const handlePhasesChange = (newPhases: PhaseConfig[]) => {
    setPhaseConfigs(newPhases);
  };

  const isDraftOrUpcoming =
    tournament.status === "draft" || tournament.status === "upcoming";
  const isActive = tournament.status === "active";
  // Allow editing when draft/upcoming (full edit) or active (partial edit)
  const canEdit = isDraftOrUpcoming || isActive;
  // Locked sections: basic info and game settings are locked once tournament is active
  const canEditLockedSections = isDraftOrUpcoming;
  const canDelete = tournament.status === "draft";

  // Compute which phases are locked (active or completed — not pending)
  const lockedPhaseIds = new Set(
    phaseConfigs
      .filter((p) => p.status === "active" || p.status === "completed")
      .map((p) => p.id)
  );

  // Allow adding/removing phases when editing — new phases are always pending
  // For active tournaments, removing is gated per-phase via lockedPhaseIds
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
            Tournament settings cannot be edited after the tournament has
            finished.
          </AlertDescription>
        </Alert>
      )}

      {isActive && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tournament is active. Basic information, game settings, and
            in-progress phases are locked. Registration, scheduling, and pending
            phases can still be edited.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Tournament name and description</CardDescription>
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
              disabled={!isEditing || !canEditLockedSections}
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
              disabled={!isEditing || !canEditLockedSections}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Game Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
          <CardDescription>
            Pokemon game, format, and battle platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TournamentGameSettings
            game={formData.game}
            gameFormat={formData.gameFormat}
            platform={formData.platform}
            battleFormat={formData.battleFormat}
            onGameChange={(game) =>
              setFormData((prev) => ({ ...prev, game: game || "" }))
            }
            onGameFormatChange={(gameFormat) =>
              setFormData((prev) => ({ ...prev, gameFormat: gameFormat || "" }))
            }
            onPlatformChange={(platform) =>
              setFormData((prev) => ({ ...prev, platform }))
            }
            onBattleFormatChange={(battleFormat) =>
              setFormData((prev) => ({ ...prev, battleFormat }))
            }
            disabled={!isEditing || !canEditLockedSections}
          />
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Tournament dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DateTimeField
              label="Start Date & Time"
              description="When the tournament begins"
              value={formData.startDate}
              outputFormat="iso"
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  startDate: (val as string | undefined) ?? null,
                }))
              }
              disabled={!isEditing}
            />

            <DateTimeField
              label="End Date & Time"
              description="Expected end time (optional)"
              value={formData.endDate}
              outputFormat="iso"
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: (val as string | undefined) ?? null,
                }))
              }
              minDate={
                formData.startDate ? new Date(formData.startDate) : undefined
              }
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registration
          </CardTitle>
          <CardDescription>
            Registration type, player cap, and check-in settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Type */}
          <div className="space-y-2">
            <Label>Registration Type</Label>
            <ButtonGroup className="mt-1">
              <Button
                type="button"
                variant={
                  formData.registrationType === "open" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData((prev) => ({ ...prev, registrationType: "open" }))
                }
                disabled={!isEditing}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Globe className="h-3.5 w-3.5" />
                Open Registration
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={true}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                Invite Only (coming soon)
              </Button>
            </ButtonGroup>
          </div>

          {/* Player Cap */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="playerCap" className="text-base">
                  Player Cap
                </Label>
                <p className="text-muted-foreground text-sm">
                  Limit the number of participants
                </p>
              </div>
              <Switch
                id="playerCap"
                checked={formData.playerCapEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    playerCapEnabled: checked,
                    maxParticipants: checked
                      ? prev.maxParticipants || "32"
                      : "",
                  }))
                }
                disabled={!isEditing}
              />
            </div>

            {formData.playerCapEnabled && (
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Players</Label>
                <div className="flex items-center gap-2">
                  <Users className="text-muted-foreground h-4 w-4" />
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
                    placeholder="32"
                    min="4"
                    max="512"
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">players</span>
                </div>
              </div>
            )}
          </div>

          {/* Check-in Required */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="checkInRequired" className="text-base">
                Check-in Required
              </Label>
              <p className="text-muted-foreground text-sm">
                Players must check in before the tournament starts
              </p>
            </div>
            <Switch
              id="checkInRequired"
              checked={formData.checkInRequired}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, checkInRequired: checked }))
              }
              disabled={!isEditing}
            />
          </div>

          {/* Late Registration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lateRegistration" className="text-base">
                  Late Registration
                </Label>
                <p className="text-muted-foreground text-sm">
                  Allow players to register and check in after the tournament
                  starts
                </p>
              </div>
              <Switch
                id="lateRegistration"
                checked={formData.allowLateRegistration}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    allowLateRegistration: checked,
                    lateCheckInMaxRound: checked
                      ? prev.lateCheckInMaxRound || 3
                      : undefined,
                  }))
                }
                disabled={!isEditing}
              />
            </div>

            {formData.allowLateRegistration && (
              <div className="space-y-2">
                <Label htmlFor="lateCheckInMaxRound">Close After Round</Label>
                <p className="text-muted-foreground text-sm">
                  Registration and check-in close when this round begins
                </p>
                <Input
                  id="lateCheckInMaxRound"
                  type="number"
                  value={formData.lateCheckInMaxRound || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lateCheckInMaxRound:
                        parseInt(e.target.value) || undefined,
                    }))
                  }
                  placeholder="3"
                  min="1"
                  max="10"
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tournament Structure
          </CardTitle>
          <CardDescription>
            Tournament phases and format settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            lockedPhaseIds={isEditing ? lockedPhaseIds : undefined}
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
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button variant="destructive" />}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tournament
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete tournament?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the tournament and all
                        associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
