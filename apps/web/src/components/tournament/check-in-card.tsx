"use client";

import { useState, useEffect } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getCheckInStatus,
  getCheckInStats,
  checkIn,
  undoCheckIn,
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type CheckedInPlayer = {
  altId: number;
  displayName: string;
  checkedInAt: number;
};

interface CheckInCardProps {
  tournamentId: number;
  isOrganizer?: boolean;
  hasTeam?: boolean;
}

export function CheckInCard({
  tournamentId,
  isOrganizer = false,
  hasTeam = true,
}: CheckInCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const { data: checkInStatus, refetch: refetchStatus } = useSupabaseQuery(
    (supabase) => getCheckInStatus(supabase, tournamentId),
    [tournamentId]
  );

  const { data: checkInStats, refetch: refetchStats } = useSupabaseQuery(
    (supabase) => getCheckInStats(supabase, tournamentId),
    [tournamentId]
  );

  const { mutateAsync: checkInMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) => checkIn(supabase, tournamentId)
  );

  const { mutateAsync: undoCheckInMutation } = useSupabaseMutation(
    (supabase, _args: Record<string, never>) =>
      undoCheckIn(supabase, tournamentId)
  );

  // Update countdown timer
  useEffect(() => {
    const endTime = checkInStatus?.checkInEndTime;
    if (!endTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeRemaining("Check-in closed");
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s remaining`);
      } else {
        setTimeRemaining(`${seconds}s remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [checkInStatus?.checkInEndTime]);

  const handleCheckIn = async () => {
    setIsChecking(true);
    try {
      await checkInMutation({});
      toast.success("Checked in successfully", {
        description: "You're all set for the tournament!",
      });
      refetchStatus();
      refetchStats();
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
      refetchStatus();
      refetchStats();
    } catch (error) {
      toast.error("Failed to undo check-in", {
        description: error instanceof Error ? error.message : "Failed to undo",
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (!checkInStatus || !checkInStats) {
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

  // For non-registered users
  if (!checkInStatus.isRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Tournament Check-In
          </CardTitle>
          <CardDescription>You must be registered to check in</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Register for the tournament first to access check-in
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check-in not yet open
  if (
    !checkInStatus.checkInOpen &&
    checkInStatus.checkInStartTime &&
    checkInStatus.checkInStartTime > Date.now()
  ) {
    const startDate = new Date(checkInStatus.checkInStartTime);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-In Opens Soon
          </CardTitle>
          <CardDescription>
            Check-in will open at {startDate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Come back at {startDate.toLocaleString()} to check in
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check-in closed
  if (
    !checkInStatus.checkInOpen &&
    checkInStatus.checkInEndTime &&
    checkInStatus.checkInEndTime < Date.now()
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Check-In Closed
          </CardTitle>
          <CardDescription>The check-in window has ended</CardDescription>
        </CardHeader>
        <CardContent>
          {checkInStatus.isCheckedIn ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                You successfully checked in before the deadline
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You missed the check-in deadline and cannot participate
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Check-in is open
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Tournament Check-In
            </CardTitle>
            <CardDescription>
              Confirm your attendance for the tournament
            </CardDescription>
          </div>
          {timeRemaining && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check-in Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Check-in Progress</span>
            <span className="font-medium">
              {checkInStats.checkedIn} / {checkInStats.total} players
            </span>
          </div>
          <Progress value={checkInStats.checkedInPercentage} />
          <p className="text-muted-foreground text-xs">
            {checkInStats.checkedInPercentage}% of registered players have
            checked in
          </p>
        </div>

        {/* User Check-in Status */}
        {checkInStatus.isCheckedIn ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="font-medium text-green-600">
              You are checked in and ready to play!
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to check in to confirm your participation
            </AlertDescription>
          </Alert>
        )}

        {/* Team submission warning */}
        {!hasTeam && !checkInStatus.isCheckedIn && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Submit your team before checking in.
            </AlertDescription>
          </Alert>
        )}

        {/* Check-in Button */}
        <div className="flex gap-2">
          {checkInStatus.isCheckedIn ? (
            <Button
              variant="outline"
              onClick={handleUndoCheckIn}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Undo Check-In
            </Button>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={!hasTeam || isChecking}
              className="w-full"
            >
              {isChecking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Check In Now
            </Button>
          )}
        </div>

        {/* Organizer Stats */}
        {isOrganizer && checkInStats.checkedInList.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Recently Checked In
            </h4>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {checkInStats.checkedInList
                .slice(0, 5)
                .map((player: CheckedInPlayer) => (
                  <div
                    key={player.altId}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="font-medium">{player.displayName}</span>
                    <span className="text-muted-foreground text-xs">
                      {player.checkedInAt
                        ? new Date(player.checkedInAt).toLocaleTimeString()
                        : ""}
                    </span>
                  </div>
                ))}
            </div>
            {checkInStats.checkedInList.length > 5 && (
              <p className="text-muted-foreground text-center text-xs">
                +{checkInStats.checkedInList.length - 5} more players
              </p>
            )}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 border-t pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {checkInStats.checkedIn}
            </p>
            <p className="text-muted-foreground text-xs">Checked In</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {checkInStats.registered}
            </p>
            <p className="text-muted-foreground text-xs">Not Checked In</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
