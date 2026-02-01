"use client";

import { useState } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getRegistrationStatus,
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
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RegisterModal } from "./register-modal";

interface RegistrationCardProps {
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
}

export function RegistrationCard({
  tournamentId,
  tournamentSlug,
  tournamentName,
}: RegistrationCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const {
    data: registrationStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useSupabaseQuery(
    (supabase) => getRegistrationStatus(supabase, tournamentId),
    [tournamentId]
  );

  const { mutateAsync: withdrawMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) =>
      withdrawFromTournament(supabase, tournamentId)
  );

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
    isLateRegistration,
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
              <Badge
                variant={isFull ? "secondary" : "default"}
                className={
                  isLateRegistration
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-600"
                    : ""
                }
              >
                {isFull
                  ? "Waitlist Open"
                  : isLateRegistration
                    ? "Late Registration"
                    : "Registration Open"}
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

          {/* Registration Deadline (hidden during late registration) */}
          {tournament.registrationDeadline && !isLateRegistration && (
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

          {/* Late registration info alert */}
          {isLateRegistration && !userStatus && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                This tournament is in progress and accepting late registrations.
              </AlertDescription>
            </Alert>
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
                  : "\u221E"}
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

      {/* Shared Registration Modal */}
      <RegisterModal
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        tournamentId={tournamentId}
        tournamentSlug={tournamentSlug}
        tournamentName={tournamentName}
        isFull={isFull}
        onSuccess={() => {
          refetchStatus();
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
