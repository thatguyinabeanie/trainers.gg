"use client";

import * as React from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  AlertTriangle,
  Trash2,
  Layers,
  CalendarIcon,
  Clock,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveTournamentPhasesAction } from "@/actions/tournaments";
import type { PhaseConfig, CutRule } from "@/lib/types/tournament";
import { dbPhasesToPhaseConfigs } from "@/lib/tournament/adapters";
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

interface DateTimeFieldProps {
  label: string;
  description: string;
  value?: string | null;
  onChange: (isoString: string | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

function DateTimeField({
  label,
  description,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value) : undefined;
  const hours = date ? date.getHours() : 12;
  const minutes = date ? date.getMinutes() : 0;

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) {
      onChange(undefined);
      return;
    }
    const newDate = new Date(selected);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (type: "hours" | "minutes", val: string) => {
    const numVal = parseInt(val, 10);
    const newDate = date ? new Date(date) : new Date();

    if (type === "hours") {
      newDate.setHours(numVal);
    } else {
      newDate.setMinutes(numVal);
    }

    onChange(newDate.toISOString());
  };

  const formatDisplay = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);
  const minutesOptions = [0, 15, 30, 45];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]",
            !date && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          {date ? formatDisplay(date) : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            defaultMonth={date}
          />

          <div className="border-border flex items-center gap-2 border-t p-3">
            <Clock className="text-muted-foreground h-4 w-4" />
            <Select
              value={hours.toString()}
              onValueChange={(val) => val && handleTimeChange("hours", val)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hoursOptions.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={minutes.toString()}
              onValueChange={(val) => val && handleTimeChange("minutes", val)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutesOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-border flex justify-end gap-2 border-t p-2">
            {date && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
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
    game: tournament.game || "sv",
    gameFormat: tournament.game_format || "reg-i",
    platform: (tournament.platform as BattlePlatform) || "cartridge",
    battleFormat: (tournament.battle_format as BattleFormat) || "doubles",
    maxParticipants: tournament.max_participants?.toString() || "",
    playerCapEnabled: tournament.max_participants !== null,
    startDate: tournament.start_date || undefined,
    endDate: tournament.end_date || undefined,
    // Registration settings
    registrationType:
      (tournament.registration_type as "open" | "invite_only") || "open",
    checkInRequired: tournament.check_in_required ?? false,
    allowLateRegistration: tournament.allow_late_registration ?? false,
    lateCheckInMaxRound: tournament.late_check_in_max_round ?? undefined,
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
          startDate?: string;
          endDate?: string;
          maxParticipants?: number | null;
          game?: string;
          gameFormat?: string;
          platform?: string;
          battleFormat?: string;
          registrationType?: string;
          checkInRequired?: boolean;
          allowLateRegistration?: boolean;
          lateCheckInMaxRound?: number | null;
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
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxParticipants: formData.playerCapEnabled
            ? parseInt(formData.maxParticipants) || null
            : null,
          game: formData.game,
          gameFormat: formData.gameFormat,
          platform: formData.platform,
          battleFormat: formData.battleFormat,
          registrationType: formData.registrationType,
          checkInRequired: formData.checkInRequired,
          allowLateRegistration: formData.allowLateRegistration,
          lateCheckInMaxRound: formData.allowLateRegistration
            ? (formData.lateCheckInMaxRound ?? null)
            : null,
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
      game: tournament.game || "sv",
      gameFormat: tournament.game_format || "reg-i",
      platform: (tournament.platform as BattlePlatform) || "cartridge",
      battleFormat: (tournament.battle_format as BattleFormat) || "doubles",
      maxParticipants: tournament.max_participants?.toString() || "",
      playerCapEnabled: tournament.max_participants !== null,
      startDate: tournament.start_date || undefined,
      endDate: tournament.end_date || undefined,
      registrationType:
        (tournament.registration_type as "open" | "invite_only") || "open",
      checkInRequired: tournament.check_in_required ?? false,
      allowLateRegistration: tournament.allow_late_registration ?? false,
      lateCheckInMaxRound: tournament.late_check_in_max_round ?? undefined,
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
            disabled={!isEditing}
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
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, startDate: val }))
              }
              disabled={!isEditing}
            />

            <DateTimeField
              label="End Date & Time"
              description="Expected end time (optional)"
              value={formData.endDate}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, endDate: val }))
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
