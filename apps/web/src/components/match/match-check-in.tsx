"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirmMatchCheckInAction } from "@/actions/matches";

interface MatchCheckInProps {
  matchId: number;
  tournamentId: number;
  isParticipant: boolean;
  isPlayer1: boolean;
  player1CheckedIn: boolean;
  player2CheckedIn: boolean;
  myName: string;
  opponentName: string;
  onCheckInComplete: (matchActivated: boolean) => void;
}

export function MatchCheckIn({
  matchId,
  tournamentId,
  isParticipant,
  isPlayer1,
  player1CheckedIn,
  player2CheckedIn,
  myName,
  opponentName,
  onCheckInComplete,
}: MatchCheckInProps) {
  const [isPending, setIsPending] = useState(false);

  // Determine which confirmation belongs to the current user
  const myCheckedIn = isPlayer1 ? player1CheckedIn : player2CheckedIn;
  const opponentCheckedIn = isPlayer1 ? player2CheckedIn : player1CheckedIn;

  const handleCheckIn = async () => {
    setIsPending(true);
    const result = await confirmMatchCheckInAction(matchId, tournamentId);
    setIsPending(false);

    if (result.success) {
      onCheckInComplete(result.data?.matchActivated ?? false);
    } else {
      toast.error(result.error);
    }
  };

  // Staff view: show status only (no check-in button)
  if (!isParticipant) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="flex items-center justify-center gap-6 py-4">
          <CheckInStatus
            label={isPlayer1 ? myName : opponentName}
            checkedIn={player1CheckedIn}
          />
          <div className="text-muted-foreground text-xs">vs</div>
          <CheckInStatus
            label={isPlayer1 ? opponentName : myName}
            checkedIn={player2CheckedIn}
          />
        </CardContent>
      </Card>
    );
  }

  // Both checkedIn — match is activating (brief flash state)
  if (myCheckedIn && opponentCheckedIn) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-primary/20 bg-primary/5",
        myCheckedIn && "border-muted bg-muted/30"
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 py-5 sm:flex-row sm:justify-between sm:py-4">
        <div className="flex items-center gap-6">
          <CheckInStatus label={myName} checkedIn={myCheckedIn} isYou />
          <div className="text-muted-foreground text-xs">vs</div>
          <CheckInStatus label={opponentName} checkedIn={opponentCheckedIn} />
        </div>

        {!myCheckedIn ? (
          <Button
            onClick={handleCheckIn}
            disabled={isPending}
            size="lg"
            className="w-full gap-2 sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Ready
          </Button>
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 animate-pulse" />
            Waiting for opponent...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckInStatus({
  label,
  checkedIn,
  isYou = false,
}: {
  label: string;
  checkedIn: boolean;
  isYou?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          checkedIn
            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {checkedIn ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          checkedIn
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground"
        )}
      >
        {label}
        {isYou && " (you)"}
      </span>
    </div>
  );
}
