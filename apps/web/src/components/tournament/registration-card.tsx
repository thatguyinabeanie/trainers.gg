"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getRegistrationStatus,
  getUserTeams,
  registerForTournament,
  withdrawFromTournament,
} from "@trainers/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface RegistrationCardProps {
  tournamentId: number;
}

export function RegistrationCard({ tournamentId }: RegistrationCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");

  const {
    data: registrationStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useSupabaseQuery(
    useCallback(
      (supabase) => getRegistrationStatus(supabase, tournamentId),
      [tournamentId]
    ),
    [tournamentId]
  );

  const { data: userTeams } = useSupabaseQuery(
    useCallback((supabase) => getUserTeams(supabase), []),
    []
  );

  const { mutateAsync: registerMutation } = useSupabaseMutation(
    (supabase, data: { teamName?: string; notes?: string }) =>
      registerForTournament(supabase, tournamentId, data)
  );

  const { mutateAsync: withdrawMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) =>
      withdrawFromTournament(supabase, tournamentId)
  );

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const result = await registerMutation({
        teamName: teamName || undefined,
        notes: notes || undefined,
      });

      toast.success(
        result.status === "waitlist"
          ? "Added to waitlist"
          : "Registration successful",
        {
          description:
            result.status === "waitlist"
              ? "You'll be notified if a spot opens up"
              : "You're registered for the tournament!",
        }
      );

      setShowRegistrationDialog(false);
      setSelectedTeamId(null);
      setTeamName("");
      setNotes("");
      refetchStatus();
    } catch (error) {
      toast.error("Registration failed", {
        description:
          error instanceof Error ? error.message : "Failed to register",
      });
    } finally {
      setIsRegistering(false);
    }
  };

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
      refetchStatus();
    } catch (error) {
      toast.error("Withdrawal failed", {
        description:
          error instanceof Error ? error.message : "Failed to withdraw",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoadingStatus || !registrationStatus) {
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

  const {
    tournament,
    registrationStats,
    userStatus,
    isRegistrationOpen,
    isFull,
  } = registrationStatus;
  const registrationPercentage = tournament.maxParticipants
    ? (registrationStats.registered / tournament.maxParticipants) * 100
    : 0;

  // Calculate time until deadline
  const deadlineText = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).toLocaleString()
    : "No deadline";

  const isDeadlineSoon = tournament.registrationDeadline
    ? tournament.registrationDeadline - Date.now() < 24 * 60 * 60 * 1000 // Less than 24 hours
    : false;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tournament Registration
              </CardTitle>
              <CardDescription>
                Sign up to participate in {tournament.name}
              </CardDescription>
            </div>
            {isRegistrationOpen && (
              <Badge variant={isFull ? "secondary" : "default"}>
                {isFull ? "Waitlist Open" : "Registration Open"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Registration Progress */}
          {tournament.maxParticipants && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Registration Progress
                </span>
                <span className="font-medium">
                  {registrationStats.registered} / {tournament.maxParticipants}{" "}
                  players
                </span>
              </div>
              <Progress value={registrationPercentage} />
              {registrationStats.waitlist > 0 && (
                <p className="text-muted-foreground text-xs">
                  +{registrationStats.waitlist} on waitlist
                </p>
              )}
            </div>
          )}

          {/* Registration Deadline */}
          {tournament.registrationDeadline && (
            <div
              className={`rounded-lg border p-3 ${isDeadlineSoon ? "border-orange-500/50 bg-orange-500/10" : ""}`}
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock
                  className={`h-4 w-4 ${isDeadlineSoon ? "text-orange-600" : "text-muted-foreground"}`}
                />
                <span className="font-medium">Registration Deadline:</span>
                <span
                  className={
                    isDeadlineSoon ? "font-medium text-orange-600" : ""
                  }
                >
                  {deadlineText}
                </span>
              </div>
            </div>
          )}

          {/* User Registration Status */}
          {userStatus ? (
            <Alert
              className={
                userStatus.status === "registered"
                  ? "border-green-500/50 bg-green-500/10"
                  : userStatus.status === "waitlist"
                    ? "border-orange-500/50 bg-orange-500/10"
                    : ""
              }
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  userStatus.status === "registered"
                    ? "text-green-600"
                    : "text-orange-600"
                }`}
              />
              <AlertDescription className="font-medium">
                {userStatus.status === "registered"
                  ? "You are registered for this tournament"
                  : userStatus.status === "waitlist"
                    ? `You are #${userStatus.waitlistPosition ?? "?"} on the waitlist`
                    : userStatus.status === "checked_in"
                      ? "You are checked in and ready to play"
                      : "Registration status unknown"}
              </AlertDescription>
            </Alert>
          ) : isRegistrationOpen ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isFull
                  ? "Tournament is full. You can join the waitlist."
                  : "You are not registered for this tournament yet."}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>
                Registration is closed for this tournament
              </AlertDescription>
            </Alert>
          )}

          {/* Registration Stats */}
          <div className="grid grid-cols-3 gap-3 border-t pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {registrationStats.registered}
              </p>
              <p className="text-muted-foreground text-xs">Registered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {registrationStats.waitlist}
              </p>
              <p className="text-muted-foreground text-xs">Waitlist</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {tournament.maxParticipants
                  ? Math.max(
                      0,
                      tournament.maxParticipants - registrationStats.registered
                    )
                  : "∞"}
              </p>
              <p className="text-muted-foreground text-xs">Spots Left</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {userStatus ? (
              <Button
                variant="outline"
                onClick={handleWithdraw}
                disabled={isRegistering || tournament.status !== "upcoming"}
                className="w-full"
              >
                {isRegistering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Withdraw Registration
              </Button>
            ) : (
              <Button
                onClick={() => setShowRegistrationDialog(true)}
                disabled={!isRegistrationOpen || isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isFull ? "Join Waitlist" : "Register Now"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      <Dialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for Tournament</DialogTitle>
            <DialogDescription>
              Choose a team and provide any additional information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Select Team (Optional)</Label>
              <Select
                value={selectedTeamId?.toString() ?? ""}
                onValueChange={(value) =>
                  setSelectedTeamId(value ? Number(value) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team selected</SelectItem>
                  {userTeams?.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name} ({team.pokemonCount}/6 Pokemon)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Name (if no team selected) */}
            {!selectedTeamId && (
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <input
                  id="team-name"
                  type="text"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for the organizer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegistrationDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trophy className="mr-2 h-4 w-4" />
              )}
              {isFull ? "Join Waitlist" : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
