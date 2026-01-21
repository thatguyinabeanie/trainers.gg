"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getTournamentInvitationsReceived,
  respondToTournamentInvitation,
} from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Check,
  X,
  Calendar,
  Clock,
  Trophy,
  User,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TournamentInvitationsViewProps {
  className?: string;
}

interface RespondArgs {
  invitationId: string;
  response: "accept" | "decline";
}

export function TournamentInvitationsView({
  className,
}: TournamentInvitationsViewProps) {
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const {
    data: invitations,
    isLoading,
    refetch,
  } = useSupabaseQuery(
    useCallback(
      (supabase) => getTournamentInvitationsReceived(supabase),
      []
    ),
    []
  );

  const { mutateAsync: respondToInvitation } = useSupabaseMutation(
    (supabase, args: RespondArgs) =>
      respondToTournamentInvitation(supabase, args.invitationId, args.response)
  );

  const handleResponse = async (
    invitationId: string,
    response: "accept" | "decline"
  ) => {
    setRespondingTo(invitationId);
    try {
      const result = await respondToInvitation({
        invitationId,
        response,
      });

      toast.success(
        response === "accept" ? "Invitation accepted!" : "Invitation declined",
        {
          description:
            result.registration?.message ||
            `You have ${response === "accept" ? "accepted" : "declined"} the tournament invitation.`,
        }
      );

      // Refetch invitations after response
      refetch();
    } catch (error) {
      toast.error("Failed to respond", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className || ""}`}>
        <div className="bg-muted h-8 animate-pulse rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="bg-muted h-6 w-3/4 rounded" />
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-4 w-1/2 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingInvitations = (invitations ?? []).filter(
    (inv) => inv.status === "pending" && !inv.isExpired
  );
  const respondedInvitations = (invitations ?? []).filter(
    (inv) =>
      inv.status === "accepted" || inv.status === "declined" || inv.isExpired
  );

  const InvitationCard = ({
    invitation,
  }: {
    invitation: NonNullable<typeof invitations>[0];
  }) => {
    const isExpired = invitation.isExpired;
    const isPending = invitation.status === "pending" && !isExpired;

    return (
      <Card
        key={invitation.id}
        className={`transition-all ${isPending ? "border-primary/20" : ""}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="text-primary h-5 w-5" />
              <div>
                <CardTitle className="text-lg">
                  {invitation.tournament?.name}
                </CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      invitation.tournament?.status === "upcoming"
                        ? "default"
                        : invitation.tournament?.status === "active"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {invitation.tournament?.status}
                  </Badge>
                  {invitation.tournament?.format && (
                    <Badge variant="outline">
                      {invitation.tournament.format}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Badge
              variant={
                isPending
                  ? "default"
                  : invitation.status === "accepted"
                    ? "secondary"
                    : invitation.status === "declined"
                      ? "destructive"
                      : "outline"
              }
            >
              {isExpired ? "Expired" : invitation.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invitation Details */}
          <div className="text-muted-foreground space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Invited by {invitation.invitedBy?.displayName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Invited{" "}
                {formatDistanceToNow(new Date(invitation.invitedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {invitation.tournament?.start_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Starts{" "}
                  {formatDistanceToNow(
                    new Date(invitation.tournament.start_date),
                    { addSuffix: true }
                  )}
                </span>
              </div>
            )}
            {invitation.expiresAt && !isExpired && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-orange-600">
                  Expires{" "}
                  {formatDistanceToNow(new Date(invitation.expiresAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Personal Message */}
          {invitation.message && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Personal Message</p>
                  <p className="text-muted-foreground text-sm">
                    {invitation.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isPending && (
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button
                    variant="default"
                    className="flex-1 gap-2"
                    disabled={respondingTo === invitation.id}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Accept Tournament Invitation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      You&apos;re about to accept the invitation to &quot;
                      {invitation.tournament?.name}&quot;. This will
                      automatically register you for the tournament.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleResponse(invitation.id, "accept")}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Accept & Register
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleResponse(invitation.id, "decline")}
                disabled={respondingTo === invitation.id}
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}

          {/* Response Status */}
          {invitation.status === "accepted" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>
                You accepted this invitation
                {invitation.respondedAt && (
                  <span className="text-muted-foreground">
                    {" "}
                    ·{" "}
                    {formatDistanceToNow(new Date(invitation.respondedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </span>
            </div>
          )}

          {invitation.status === "declined" && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <X className="h-4 w-4" />
              <span>
                You declined this invitation
                {invitation.respondedAt && (
                  <span className="text-muted-foreground">
                    {" "}
                    ·{" "}
                    {formatDistanceToNow(new Date(invitation.respondedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </span>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span>This invitation has expired</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <Tabs defaultValue="pending" className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6" />
            <h2 className="text-2xl font-semibold">Tournament Invitations</h2>
          </div>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingInvitations.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                  No pending invitations
                </h3>
                <p className="text-muted-foreground">
                  You don&apos;t have any tournament invitations at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {respondedInvitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                  No invitation history
                </h3>
                <p className="text-muted-foreground">
                  Past tournament invitations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            respondedInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
