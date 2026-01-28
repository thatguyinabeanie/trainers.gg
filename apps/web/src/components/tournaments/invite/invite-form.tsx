"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSupabaseMutation } from "@/lib/supabase";
import { sendTournamentInvitations } from "@trainers/supabase";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Send, Loader2, Info, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { PlayerSearch } from "./player-search";

interface InviteFormProps {
  tournamentId: number;
  tournamentName: string;
  onSuccess?: () => void;
  maxInvitations?: number;
}

interface SendInvitationsArgs {
  tournamentId: number;
  profileIds: number[];
  message?: string;
}

const inviteFormSchema = z.object({
  message: z.string().max(500).optional(),
  sendNotification: z.boolean(),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export function InviteForm({
  tournamentId,
  tournamentName,
  onSuccess,
  maxInvitations = 50,
}: InviteFormProps) {
  // Player selection managed separately since it involves complex search/select UI
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      message: "",
      sendNotification: true,
    },
  });

  const { isSubmitting } = form.formState;
  const message = form.watch("message") ?? "";

  const { mutateAsync: sendInvitations } = useSupabaseMutation(
    (supabase, args: SendInvitationsArgs) =>
      sendTournamentInvitations(
        supabase,
        args.tournamentId,
        args.profileIds,
        args.message
      )
  );

  const handleSelectPlayer = (player: SelectedPlayer) => {
    setSelectedPlayers((prev) => [...prev, player]);
    setSuccessCount(null);
  };

  const handleRemovePlayer = (playerId: number) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setSuccessCount(null);
  };

  const onSubmit = async (data: InviteFormData) => {
    if (selectedPlayers.length === 0) {
      toast.error("No players selected", {
        description: "Please select at least one player to invite",
      });
      return;
    }

    setSuccessCount(null);

    try {
      const result = await sendInvitations({
        tournamentId,
        profileIds: selectedPlayers.map((p) => p.id),
        message: data.message?.trim() || undefined,
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
        form.reset({ message: "", sendNotification: true });
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
    }
  };

  const handleClear = () => {
    setSelectedPlayers([]);
    form.reset({ message: "", sendNotification: true });
    setSuccessCount(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Invite Players
        </CardTitle>
        <CardDescription>
          Send tournament invitations to players
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Hey! I'd like to invite you to participate in ${tournamentName}. Looking forward to seeing you compete!`}
                      rows={3}
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {message.length}/500 characters
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Notification Toggle */}
            <FormField
              control={form.control}
              name="sendNotification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">
                      Send notification
                    </FormLabel>
                    <FormDescription>
                      Notify players via in-app notification
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isSubmitting || selectedPlayers.length === 0}
            >
              Clear
            </Button>
            <Button
              type="submit"
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
        </form>
      </Form>
    </Card>
  );
}
