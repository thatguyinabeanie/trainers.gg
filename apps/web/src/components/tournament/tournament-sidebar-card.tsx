"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getRegistrationStatus,
  getCheckInStatus,
  getCheckInStats,
  checkIn,
  undoCheckIn,
  withdrawFromTournament,
} from "@trainers/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Clock,
  Hourglass,
  Link,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  submitTeamAction,
  selectTeamAction,
  getUserTeamsAction,
  dropFromTournament,
} from "@/actions/tournaments";
import {
  parseAndValidateTeam,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  type ValidationResult,
} from "@trainers/validators/team";
import { RegisterModal } from "./register-modal";
import { TeamPreview } from "./team-preview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TournamentSidebarCardProps {
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  gameFormat: string | null;
  initialTeam: {
    teamId: number;
    submittedAt: string | null;
    locked: boolean;
    pokemon: Array<{
      species: string;
      nickname?: string | null;
      held_item?: string | null;
      ability?: string;
      tera_type?: string | null;
    }>;
  } | null;
}

type TeamInputMode = "paste" | "url";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Compact status banner used for completed phases.
 * Variants: success (teal), warning (amber), muted (gray)
 */
function StatusBanner({
  icon,
  title,
  subtitle,
  variant = "success",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  variant?: "success" | "warning" | "danger" | "muted";
}) {
  const variantStyles = {
    success: "bg-primary/10",
    warning: "bg-amber-500/10",
    danger: "bg-red-500/10",
    muted: "bg-muted",
  };

  const titleStyles = {
    success: "text-primary",
    warning: "text-amber-600",
    danger: "text-red-600",
    muted: "text-muted-foreground",
  };

  return (
    <div className={cn("rounded-lg p-3", variantStyles[variant])}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className={cn("text-sm font-medium", titleStyles[variant])}>
            {title}
          </p>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Thin separator with a centered label.
 */
function SectionSeparator({ label }: { label: string }) {
  return (
    <div className="relative py-2">
      <Separator />
      <span className="bg-card text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs font-medium">
        {label}
      </span>
    </div>
  );
}

/**
 * Countdown timer showing time remaining until a target date.
 */
function CountdownTimer({ targetDate }: { targetDate: string | null }) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(null);
      return;
    }

    // Validate date string to prevent NaN calculations
    const targetTimestamp = new Date(targetDate).getTime();
    if (Number.isNaN(targetTimestamp)) {
      console.error(`[CountdownTimer] Invalid date string: "${targetDate}"`);
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeRemaining) return null;

  const parts = [];
  if (timeRemaining.days > 0) {
    parts.push(`${timeRemaining.days}d`);
  }
  if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
    parts.push(`${timeRemaining.hours}h`);
  }
  parts.push(`${timeRemaining.minutes}m`);
  parts.push(`${timeRemaining.seconds}s`);

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      <span className="font-mono text-xs text-amber-600">
        {parts.join(" ")}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TournamentSidebarCard({
  tournamentId,
  tournamentSlug,
  tournamentName,
  gameFormat,
  initialTeam,
}: TournamentSidebarCardProps) {
  // ---- Registration / check-in state ----
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  // timeRemaining state removed — unified model has no time-based window

  // ---- Team submission state ----
  const [submittedTeam, setSubmittedTeam] = useState(initialTeam);
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [teamInputMode, setTeamInputMode] = useState<TeamInputMode>("paste");
  const [rawText, setRawText] = useState("");
  const [pokepasteUrl, setPokepasteUrl] = useState("");
  const [isFetchingPaste, setIsFetchingPaste] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  // ---- Existing teams for selection ----
  const [availableTeams, setAvailableTeams] = useState<
    Array<{ id: number; name: string | null; pokemonCount: number }>
  >([]);
  const [isSelectingTeam, setIsSelectingTeam] = useState(false);

  // ---- Data fetching ----

  const {
    data: registrationStatus,
    error: registrationError,
    isLoading: isLoadingRegistration,
    refetch: refetchRegistration,
  } = useSupabaseQuery(
    (supabase) => getRegistrationStatus(supabase, tournamentId),
    [tournamentId]
  );

  const { data: checkInStatus, refetch: refetchCheckIn } = useSupabaseQuery(
    (supabase) => getCheckInStatus(supabase, tournamentId),
    [tournamentId]
  );

  const { data: checkInStats, refetch: refetchCheckInStats } = useSupabaseQuery(
    (supabase) => getCheckInStats(supabase, tournamentId),
    [tournamentId]
  );

  // ---- Mutations ----

  const { mutateAsync: withdrawMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) =>
      withdrawFromTournament(supabase, tournamentId)
  );

  const { mutateAsync: checkInMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) => checkIn(supabase, tournamentId)
  );

  const { mutateAsync: undoCheckInMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) =>
      undoCheckIn(supabase, tournamentId)
  );

  // Check-in countdown timer removed — unified model has no time-based window

  // ---- Live team validation ----

  useEffect(() => {
    if (!teamEditMode || !rawText.trim()) {
      setValidation(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = parseAndValidateTeam(rawText, gameFormat ?? "");
      setValidation(result);
    }, 300);

    return () => clearTimeout(timer);
  }, [rawText, gameFormat, teamEditMode]);

  // ---- Fetch available teams ----

  const showTeamSection =
    registrationStatus?.userStatus?.status === "registered" ||
    registrationStatus?.userStatus?.status === "waitlist" ||
    registrationStatus?.userStatus?.status === "checked_in" ||
    (checkInStatus?.isCheckedIn ?? false);

  useEffect(() => {
    if (!showTeamSection) return;

    let cancelled = false;

    getUserTeamsAction().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAvailableTeams(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showTeamSection]);

  // ---- Handlers ----

  const handleWithdraw = async () => {
    if (!confirm("Are you sure you want to withdraw from this tournament?")) {
      return;
    }

    setIsRegistering(true);
    try {
      await withdrawMutation({});
      toast.success("Withdrawn successfully", {
        description: "You have been removed from the tournament",
      });
      setSubmittedTeam(null);
      refetchRegistration();
    } catch (error) {
      toast.error("Withdrawal failed", {
        description:
          error instanceof Error ? error.message : "Failed to withdraw",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCheckIn = async () => {
    setIsChecking(true);
    try {
      await checkInMutation({});
      toast.success("Checked in successfully", {
        description: "You're all set for the tournament!",
      });
      refetchCheckIn();
      refetchCheckInStats();
      refetchRegistration();
    } catch (error) {
      toast.error("Check-in failed", {
        description:
          error instanceof Error ? error.message : "Failed to check in",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUndoCheckIn = async () => {
    setIsChecking(true);
    try {
      await undoCheckInMutation({});
      toast.success("Check-in undone", {
        description: "You've been unchecked from the tournament",
      });
      refetchCheckIn();
      refetchCheckInStats();
      refetchRegistration();
    } catch (error) {
      toast.error("Failed to undo check-in", {
        description: error instanceof Error ? error.message : "Failed to undo",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDrop = async () => {
    if (
      !confirm(
        "You will forfeit all remaining matches. Your results will stay on the standings. This cannot be undone."
      )
    ) {
      return;
    }

    setIsDropping(true);
    try {
      const result = await dropFromTournament(tournamentId);
      if (result.success) {
        toast.success("Dropped from tournament", {
          description: "You have been dropped from the tournament",
        });
        refetchRegistration();
        refetchCheckIn();
        refetchCheckInStats();
      } else {
        toast.error("Failed to drop", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Failed to drop", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsDropping(false);
    }
  };

  // ---- Team handlers ----

  const startTeamEditing = useCallback((mode: TeamInputMode) => {
    setTeamInputMode(mode);
    setRawText("");
    setPokepasteUrl("");
    setValidation(null);
    setTeamEditMode(true);
  }, []);

  const cancelTeamEditing = useCallback(() => {
    setRawText("");
    setPokepasteUrl("");
    setValidation(null);
    setTeamEditMode(false);
  }, []);

  const handleFetchPokepaste = useCallback(async () => {
    const parsed = parsePokepaseUrl(pokepasteUrl);
    if (!parsed) {
      toast.error("Invalid Pokepaste URL", {
        description:
          "Please enter a valid pokepast.es URL (e.g. https://pokepast.es/abc123)",
      });
      return;
    }

    setIsFetchingPaste(true);
    try {
      const rawUrl = getPokepaseRawUrl(parsed.pasteId);
      const response = await fetch(rawUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch paste (HTTP ${response.status})`);
      }

      const text = await response.text();
      setRawText(text);
      setTeamInputMode("paste");

      toast.success("Pokepaste imported", {
        description: "Team data has been loaded into the editor",
      });
    } catch (error) {
      toast.error("Failed to fetch Pokepaste", {
        description:
          error instanceof Error ? error.message : "Could not load paste data",
      });
    } finally {
      setIsFetchingPaste(false);
    }
  }, [pokepasteUrl]);

  const handleSubmitTeam = useCallback(async () => {
    if (!validation?.valid) return;

    setIsSubmittingTeam(true);
    try {
      const result = await submitTeamAction(tournamentId, rawText);

      if (result.success) {
        const speciesList = result.data.species.join(", ");
        toast.success("Team submitted", {
          description: `${result.data.teamName}: ${speciesList}`,
        });
        // Update local state with the validated team data
        setSubmittedTeam({
          teamId: result.data.teamId,
          submittedAt: new Date().toISOString(),
          locked: false,
          pokemon: validation.team.map((mon) => ({
            species: mon.species,
            nickname: mon.nickname,
            held_item: mon.held_item,
            ability: mon.ability,
            tera_type: mon.tera_type,
          })),
        });
        setTeamEditMode(false);
        setRawText("");
        refetchRegistration();
      } else {
        // Show structured validation errors if available
        if (result.validationErrors && result.validationErrors.length > 0) {
          toast.error("Team validation failed", {
            description: (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {result.validationErrors.map((err, i) => (
                  <li key={`${err}-${i}`}>{err}</li>
                ))}
              </ul>
            ),
          });
        } else {
          toast.error("Submission failed", {
            description: result.error,
          });
        }
      }
    } catch (error) {
      toast.error("Submission failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmittingTeam(false);
    }
  }, [tournamentId, rawText, validation, refetchRegistration]);

  const handleSelectTeam = useCallback(
    async (teamId: string | null) => {
      if (!teamId) return;
      const numericId = Number(teamId);
      if (isNaN(numericId)) return;

      setIsSelectingTeam(true);
      try {
        const result = await selectTeamAction(tournamentId, numericId);

        if (result.success) {
          const speciesList = result.data.species.join(", ");
          toast.success("Team selected", {
            description: `${result.data.teamName}: ${speciesList}`,
          });
          setSubmittedTeam({
            teamId: result.data.teamId,
            submittedAt: new Date().toISOString(),
            locked: false,
            // We don't have full pokemon details from the list,
            // so use a minimal placeholder — refetch will fill it in
            pokemon: Array.from({ length: result.data.pokemonCount }, () => ({
              species: "Loading...",
            })),
          });
          setTeamEditMode(false);
          refetchRegistration();
        } else {
          // Show structured validation errors if available
          if (result.validationErrors && result.validationErrors.length > 0) {
            toast.error("Team validation failed", {
              description: (
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {result.validationErrors.map((err, i) => (
                    <li key={`${err}-${i}`}>{err}</li>
                  ))}
                </ul>
              ),
            });
          } else {
            toast.error("Selection failed", {
              description: result.error,
            });
          }
        }
      } catch (error) {
        toast.error("Selection failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      } finally {
        setIsSelectingTeam(false);
      }
    },
    [tournamentId, refetchRegistration]
  );

  // ---- Loading state ----

  if (isLoadingRegistration) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Error / no data state ----

  if (registrationError || !registrationStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Unable to load registration status.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRegistration()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- Derived state ----

  const {
    tournament,
    registrationStats,
    userStatus,
    isRegistrationOpen,
    isLateRegistration,
    isFull,
  } = registrationStatus;

  // Return null for completed/cancelled tournaments
  if (tournament.status !== "upcoming" && tournament.status !== "active") {
    return null;
  }

  const registrationPercentage = tournament.maxParticipants
    ? Math.min(
        100,
        (registrationStats.registered / tournament.maxParticipants) * 100
      )
    : 0;

  // Check-in derived state
  const isCheckInOpen = checkInStatus?.checkInOpen ?? false;
  const isCheckedIn = checkInStatus?.isCheckedIn ?? false;
  const isRegistered = userStatus?.status === "registered";
  const isOnWaitlist = userStatus?.status === "waitlist";
  const userIsCheckedIn = userStatus?.status === "checked_in" || isCheckedIn;

  const lateMaxRound =
    checkInStatus?.lateMaxRound ?? tournament.lateCheckInMaxRound ?? null;

  const isDropped = userStatus?.status === "dropped";
  const hasTeam = registrationStatus?.userStatus?.hasTeam ?? !!submittedTeam;

  // ---- Badge logic ----

  const getBadge = () => {
    if (userIsCheckedIn) return null;

    if (isCheckInOpen && (isRegistered || userIsCheckedIn)) {
      return (
        <Badge variant="default" className="gap-1">
          <Clock className="h-3 w-3" />
          Check In
        </Badge>
      );
    }

    if (!isRegistrationOpen && !userStatus) {
      return <Badge variant="secondary">Closed</Badge>;
    }

    if (isLateRegistration && !userStatus) {
      return (
        <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-600">
          Late Reg
        </Badge>
      );
    }

    if (isFull && !userStatus) {
      return <Badge variant="secondary">Waitlist Open</Badge>;
    }

    if (isRegistrationOpen && !userStatus) {
      return <Badge variant="default">Open</Badge>;
    }

    return null;
  };

  // ---- Team section renderer ----

  const renderTeamSection = () => {
    if (!showTeamSection) return null;

    const isLocked = submittedTeam?.locked ?? false;
    const pokemonCount = submittedTeam?.pokemon.length ?? 0;

    // Team dropdown shared between editing and empty states
    const teamDropdown =
      availableTeams.length > 0 ? (
        <Select onValueChange={handleSelectTeam} disabled={isSelectingTeam}>
          <SelectTrigger>
            <SelectValue
              placeholder={isSelectingTeam ? "Selecting..." : "Select a team"}
            />
          </SelectTrigger>
          <SelectContent>
            {availableTeams.map((team) => (
              <SelectItem key={team.id} value={String(team.id)}>
                {team.name ?? "Unnamed Team"} ({team.pokemonCount} Pokemon)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null;

    // Editing mode
    if (teamEditMode) {
      return (
        <>
          <div className="bg-muted space-y-3 rounded-lg p-3">
            <p className="text-sm font-medium">Team</p>

            {/* Existing team dropdown */}
            {teamDropdown}

            {teamDropdown && <SectionSeparator label="or" />}

            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={teamInputMode === "paste" ? "default" : "outline"}
                size="sm"
                onClick={() => setTeamInputMode("paste")}
              >
                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                Paste
              </Button>
              <Button
                variant={teamInputMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setTeamInputMode("url")}
              >
                <Link className="mr-1.5 h-3.5 w-3.5" />
                Pokepaste URL
              </Button>
            </div>

            {/* Team lock warning */}
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Your team will be locked when the tournament begins. Make sure
                to finalize your team before the start time.
              </AlertDescription>
            </Alert>

            {/* Input area */}
            {teamInputMode === "paste" ? (
              <Textarea
                placeholder={
                  "Paste your team in Showdown export format...\n\n" +
                  "Example:\n" +
                  "Koraidon @ Booster Energy\n" +
                  "Ability: Orichalcum Pulse\n" +
                  "Tera Type: Fire\n" +
                  "EVs: 4 HP / 252 Atk / 252 Spe\n" +
                  "Jolly Nature\n" +
                  "- Flame Charge\n" +
                  "- Collision Course\n" +
                  "- Protect\n" +
                  "- Swords Dance"
                }
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://pokepast.es/abc123..."
                  value={pokepasteUrl}
                  onChange={(e) => setPokepasteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchPokepaste();
                    }
                  }}
                />
                <Button
                  onClick={handleFetchPokepaste}
                  disabled={!pokepasteUrl.trim() || isFetchingPaste}
                >
                  {isFetchingPaste ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="mr-2 h-4 w-4" />
                  )}
                  Fetch
                </Button>
              </div>
            )}

            {/* Validation errors */}
            {validation &&
              !validation.valid &&
              validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {validation.errors.map((err, i) => (
                        <li key={i}>{err.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

            {/* Team preview */}
            {validation && validation.team.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">
                  Preview ({validation.team.length} Pokemon)
                </p>
                <TeamPreview
                  pokemon={validation.team.map((mon) => ({
                    species: mon.species,
                    nickname: mon.nickname,
                    held_item: mon.held_item,
                    ability: mon.ability,
                    tera_type: mon.tera_type,
                    move1: mon.move1 ?? undefined,
                    move2: mon.move2 ?? undefined,
                    move3: mon.move3 ?? undefined,
                    move4: mon.move4 ?? undefined,
                  }))}
                  compact
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={cancelTeamEditing}
                disabled={isSubmittingTeam}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTeam}
                disabled={!validation?.valid || isSubmittingTeam}
                className="flex-1"
              >
                {isSubmittingTeam ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Submit Team
              </Button>
            </div>
          </div>
        </>
      );
    }

    // Locked team
    if (isLocked && submittedTeam) {
      return (
        <>
          <Collapsible className="space-y-3">
            <CollapsibleTrigger className="w-full text-left">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Team Locked
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {pokemonCount} Pokemon
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform [[data-panel-open]_&]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            {pokemonCount > 0 && (
              <CollapsibleContent>
                <TeamPreview pokemon={submittedTeam.pokemon} compact />
              </CollapsibleContent>
            )}
          </Collapsible>
        </>
      );
    }

    // Submitted team (not locked)
    if (submittedTeam) {
      return (
        <>
          <Collapsible className="space-y-3">
            <CollapsibleTrigger className="w-full text-left">
              <div className="bg-primary/10 flex items-center justify-between rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-5 w-5" />
                  <div>
                    <p className="text-primary text-sm font-medium">
                      Team Submitted
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {pokemonCount} Pokemon
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform [[data-panel-open]_&]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            {pokemonCount > 0 && (
              <CollapsibleContent className="space-y-3">
                <TeamPreview pokemon={submittedTeam.pokemon} compact />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTeamEditing("paste")}
                  className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Replace Team
                </Button>
              </CollapsibleContent>
            )}
          </Collapsible>
        </>
      );
    }

    // No team submitted yet — empty state
    return (
      <>
        <div className="bg-muted space-y-3 rounded-lg p-3">
          <p className="text-sm font-medium">Team</p>
          <p className="text-muted-foreground text-xs">
            Submit before check-in opens
          </p>

          {/* Existing team dropdown */}
          {teamDropdown}

          {teamDropdown && <SectionSeparator label="or" />}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => startTeamEditing("paste")}
              className="flex-1"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste Team
            </Button>
            <Button
              variant="outline"
              onClick={() => startTeamEditing("url")}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              Import URL
            </Button>
          </div>
        </div>
      </>
    );
  };

  // =========================================================================
  // PHASE 5: Dropped
  // =========================================================================

  if (isDropped) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBanner
            icon={<X className="text-muted-foreground h-5 w-5" />}
            title="Dropped"
            subtitle="You have dropped from this tournament"
            variant="muted"
          />
        </CardContent>
      </Card>
    );
  }

  // =========================================================================
  // PHASE 4: Checked In
  // =========================================================================

  if (userIsCheckedIn) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">Registration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Registration banner */}
            <StatusBanner
              icon={<CheckCircle2 className="text-primary h-5 w-5" />}
              title="Registered"
              subtitle={
                tournament.maxParticipants
                  ? `${registrationStats.registered} / ${tournament.maxParticipants} players`
                  : `${registrationStats.registered} registered`
              }
            />

            {/* Team section */}
            {renderTeamSection()}

            {/* Check-in banner */}
            <StatusBanner
              icon={<CheckCircle2 className="text-primary h-5 w-5" />}
              title="Checked In"
              subtitle={
                checkInStats
                  ? `${checkInStats.checkedIn} / ${checkInStats.total} checked in`
                  : undefined
              }
            />

            {/* Undo check-in (during check-in window) or Drop (after tournament starts) */}
            {tournament.status === "active" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDrop}
                disabled={isDropping}
                className="w-full"
              >
                {isDropping ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Drop from Tournament
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndoCheckIn}
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Undo Check-In
              </Button>
            )}
          </CardContent>
        </Card>

        <RegisterModal
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          mode="edit"
          onSuccess={() => {
            refetchRegistration();
          }}
        />
      </>
    );
  }

  // =========================================================================
  // PHASE 3: Registered — Check-In Open
  // =========================================================================

  if (isRegistered && isCheckInOpen) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">Registration</CardTitle>
              <Badge variant="default" className="gap-1">
                <Clock className="h-3 w-3" />
                Check In
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Compact registration banner */}
            <StatusBanner
              icon={<CheckCircle2 className="text-primary h-5 w-5" />}
              title="Registered"
            />

            {/* Team section */}
            {renderTeamSection()}

            <Separator />

            {/* Check-in section */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Check-In</p>

              {/* Check-in closing info */}
              {tournament.status === "upcoming" && tournament.startDate && (
                <div className="rounded-lg bg-amber-500/10 p-2.5">
                  <p className="text-muted-foreground mb-1.5 text-xs">
                    Check-in closes when tournament starts
                  </p>
                  <CountdownTimer targetDate={tournament.startDate} />
                </div>
              )}
              {tournament.status === "active" && lateMaxRound && (
                <StatusBanner
                  icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                  title="Late check-in open"
                  subtitle={`Closes after Round ${lateMaxRound} starts`}
                  variant="warning"
                />
              )}
              {tournament.status === "active" && !lateMaxRound && (
                <StatusBanner
                  icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                  title="Check in now"
                  subtitle="Check-in may close at any time"
                  variant="danger"
                />
              )}

              {/* Check-in progress */}
              {checkInStats && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {checkInStats.checkedIn} / {checkInStats.total} checked in
                    </span>
                  </div>
                  <Progress value={checkInStats.checkedInPercentage} />
                </div>
              )}

              {/* Check-in button with validation */}
              {!hasTeam ? (
                <Button disabled className="w-full" variant="outline">
                  Submit a Team to Check In
                </Button>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  disabled={isChecking}
                  className="w-full"
                >
                  {isChecking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Check In
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <RegisterModal
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          mode="edit"
          onSuccess={() => {
            refetchRegistration();
          }}
        />
      </>
    );
  }

  // =========================================================================
  // PHASE 2w: Waitlisted
  // =========================================================================

  if (isOnWaitlist) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBanner
              icon={<Hourglass className="h-5 w-5 text-amber-600" />}
              title={`Waitlisted (#${userStatus?.waitlistPosition ?? "?"})`}
              subtitle={
                tournament.maxParticipants
                  ? `${registrationStats.registered} / ${tournament.maxParticipants} players`
                  : `${registrationStats.registered} registered`
              }
              variant="warning"
            />

            {/* Team section */}
            {renderTeamSection()}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRegistrationDialog(true)}
                disabled={isRegistering}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={handleWithdraw}
                disabled={isRegistering}
                className="flex-1"
              >
                {isRegistering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <RegisterModal
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          mode="edit"
          onSuccess={() => {
            refetchRegistration();
          }}
        />
      </>
    );
  }

  // =========================================================================
  // PHASE 2: Registered — Check-In Available
  // =========================================================================

  if (isRegistered) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Registration banner */}
            <StatusBanner
              icon={<CheckCircle2 className="text-primary h-5 w-5" />}
              title="Registered"
              subtitle={
                tournament.maxParticipants
                  ? `${registrationStats.registered} / ${tournament.maxParticipants} players`
                  : `${registrationStats.registered} registered`
              }
            />

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRegistrationDialog(true)}
                disabled={isRegistering}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={handleWithdraw}
                disabled={isRegistering || tournament.status !== "upcoming"}
                className="flex-1"
              >
                {isRegistering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Withdraw
              </Button>
            </div>

            {/* Team section */}
            {renderTeamSection()}

            {/* Check-in section */}
            {isCheckInOpen ? (
              <div className="space-y-3">
                <Separator />
                <p className="text-sm font-medium">Check-In</p>

                {/* Check-in closing info */}
                {tournament.status === "upcoming" && tournament.startDate && (
                  <div className="rounded-lg bg-amber-500/10 p-2.5">
                    <p className="text-muted-foreground mb-1.5 text-xs">
                      Check-in closes when tournament starts
                    </p>
                    <CountdownTimer targetDate={tournament.startDate} />
                  </div>
                )}
                {tournament.status === "active" && lateMaxRound && (
                  <StatusBanner
                    icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                    title="Late check-in open"
                    subtitle={`Closes after Round ${lateMaxRound} starts`}
                    variant="warning"
                  />
                )}
                {tournament.status === "active" && !lateMaxRound && (
                  <StatusBanner
                    icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                    title="Check in now"
                    subtitle="Check-in may close at any time"
                    variant="danger"
                  />
                )}

                {/* Check-in progress */}
                {checkInStats && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {checkInStats.checkedIn} / {checkInStats.total} checked
                        in
                      </span>
                    </div>
                    <Progress value={checkInStats.checkedInPercentage} />
                  </div>
                )}

                {/* Team warning */}
                {!hasTeam && (
                  <p className="text-xs font-medium text-amber-600">
                    Submit your team before checking in
                  </p>
                )}

                <Button
                  onClick={handleCheckIn}
                  disabled={!hasTeam || isChecking}
                  className="w-full"
                >
                  {isChecking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Check In
                </Button>
              </div>
            ) : (
              <div className="bg-muted space-y-2 rounded-lg p-3">
                <p className="text-sm font-medium">Check-In</p>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${hasTeam ? "text-primary" : "text-muted-foreground/40"}`}
                    />
                    <span
                      className={
                        hasTeam ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      Team submitted
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="text-muted-foreground/40 h-3.5 w-3.5" />
                    <span className="text-muted-foreground">
                      Check-in opens when tournament starts
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <RegisterModal
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          mode="edit"
          onSuccess={() => {
            refetchRegistration();
          }}
        />
      </>
    );
  }

  // =========================================================================
  // PHASE 1: Not Registered
  // =========================================================================

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">Registration</CardTitle>
            {getBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress bar (only when max participants set) */}
          {tournament.maxParticipants ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {registrationStats.registered} / {tournament.maxParticipants}
                </span>
              </div>
              <Progress
                value={registrationPercentage}
                className={!isRegistrationOpen ? "opacity-50" : ""}
              />
              {registrationStats.waitlist > 0 && (
                <p className="text-muted-foreground text-xs">
                  +{registrationStats.waitlist} on waitlist
                </p>
              )}
            </div>
          ) : (
            isRegistrationOpen && (
              <p className="text-muted-foreground text-sm">
                {registrationStats.registered} registered
              </p>
            )
          )}

          {/* Info text */}
          {!isRegistrationOpen && !isLateRegistration ? (
            <p className="text-muted-foreground text-sm">
              Registration is closed
            </p>
          ) : isLateRegistration ? (
            <div>
              <p className="text-sm font-medium text-amber-600">
                Tournament in progress
              </p>
              {lateMaxRound && (
                <p className="text-muted-foreground text-xs">
                  Registration &amp; check-in open until Round {lateMaxRound}
                </p>
              )}
            </div>
          ) : null}

          {/* Register / Join Waitlist button */}
          {isRegistrationOpen || isLateRegistration ? (
            <Button
              onClick={() => setShowRegistrationDialog(true)}
              disabled={isRegistering}
              variant={isFull ? "outline" : "default"}
              className="w-full"
            >
              {isRegistering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isFull ? "Join Waitlist" : "Register"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <RegisterModal
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        tournamentId={tournamentId}
        tournamentSlug={tournamentSlug}
        tournamentName={tournamentName}
        isFull={isFull}
        onSuccess={() => {
          refetchRegistration();
          toast.success(
            isFull ? "Added to waitlist" : "Registration successful",
            {
              description: isFull
                ? "You'll be notified if a spot opens up"
                : "You're registered for the tournament!",
            }
          );
        }}
      />
    </>
  );
}
