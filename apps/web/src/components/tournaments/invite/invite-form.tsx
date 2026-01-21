"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex/api";
import type { Id } from "@trainers/backend-convex/convex/_generated/dataModel";
import type { SelectedPlayer } from "@/lib/types/tournament";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2, Info, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { PlayerSearch } from "./player-search";

interface InviteFormProps {
  tournamentId: Id<"tournaments">;
  tournamentName: string;
  onSuccess?: () => void;
  maxInvitations?: number;
}

export function InviteForm({
  tournamentId,
  tournamentName,
  onSuccess,
  maxInvitations = 50,
}: InviteFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [message, setMessage] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sendInvitations = useMutation(
    api.tournaments.invitations.sendTournamentInvitations
  );

  const handleSelectPlayer = (player: SelectedPlayer) => {
    setSelectedPlayers((prev) => [...prev, player]);
    setSuccessCount(null);
  };

  const handleRemovePlayer = (playerId: Id<"profiles">) => {
    setSelectedPlayers((prev) => prev.filter((p) => p._id !== playerId));
    setSuccessCount(null);
  };

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("No players selected", {
        description: "Please select at least one player to invite",
      });
      return;
    }

    setIsSubmitting(true);
    setSuccessCount(null);

    try {
      const result = await sendInvitations({
        data: {
          tournamentId,
          profileIds: selectedPlayers.map((p) => p._id),
          message: message.trim() || undefined,
        },
      });

      if (result.invitationsSent > 0) {
        setSuccessCount(result.invitationsSent);
        toast.success(
          `${result.invitationsSent} invitation${result.invitationsSent > 1 ? "s" : ""} sent`,
          {
            description:
              result.alreadyInvited > 0
                ? `${result.alreadyInvited} player${result.alreadyInvited > 1 ? "s were" : " was"} already invited`
                : undefined,
          }
        );

        // Clear form on success
        setSelectedPlayers([]);
        setMessage("");
        onSuccess?.();
      } else if (result.alreadyInvited > 0) {
        toast.info("All players already invited", {
          description:
            "The selected players have already been invited to this tournament",
        });
      }
    } catch (error) {
      toast.error("Failed to send invitations", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setSelectedPlayers([]);
    setMessage("");
    setSuccessCount(null);
  };

  // Prefix unused prop
  const _sendNotification = sendNotification;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Invite Players
        </CardTitle>
        <CardDescription>Send tournament invitations to players</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success message */}
        {successCount !== null && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Successfully sent {successCount} invitation
              {successCount !== 1 ? "s" : ""}!
            </AlertDescription>
          </Alert>
        )}

        {/* Player Search */}
        <PlayerSearch
          tournamentId={tournamentId}
          selectedPlayers={selectedPlayers}
          onSelectPlayer={handleSelectPlayer}
          onRemovePlayer={handleRemovePlayer}
          maxSelections={maxInvitations}
        />

        {/* Custom Message */}
        <div className="space-y-2">
          <Label htmlFor="invite-message">Personal Message (Optional)</Label>
          <Textarea
            id="invite-message"
            placeholder={`Hey! I'd like to invite you to participate in ${tournamentName}. Looking forward to seeing you compete!`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-muted-foreground text-xs">
            {message.length}/500 characters
          </p>
        </div>

        {/* Notification Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="send-notification" className="cursor-pointer">
              Send notification
            </Label>
            <p className="text-muted-foreground text-xs">
              Notify players via in-app notification
            </p>
          </div>
          <Switch
            id="send-notification"
            checked={sendNotification}
            onCheckedChange={setSendNotification}
          />
        </div>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Players will receive an invitation they can accept or decline.
            Accepted invitations automatically register the player for the
            tournament.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={isSubmitting || selectedPlayers.length === 0}
        >
          Clear
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedPlayers.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Invite {selectedPlayers.length} Player
              {selectedPlayers.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
