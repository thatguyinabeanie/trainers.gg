"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentInvitationsSent } from "@trainers/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Send,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface InvitationListProps {
  tournamentId: string;
  showActions?: boolean;
}

type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

interface InvitationData {
  id: string;
  status: InvitationStatus;
  message?: string;
  invited_at: string;
  expires_at?: string | null;
  responded_at?: string | null;
  invitedPlayer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
}

const statusConfig: Record<
  InvitationStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof Clock;
  }
> = {
  pending: {
    label: "Pending",
    variant: "default",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    variant: "secondary",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    variant: "destructive",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    variant: "outline",
    icon: Clock,
  },
};

export function InvitationList({
  tournamentId,
  showActions = true,
}: InvitationListProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use the getTournamentInvitationsSent query filtered by tournamentId
  const { data: invitations, isLoading: isLoadingInvitations } =
    useSupabaseQuery(
      useCallback(
        (supabase) => getTournamentInvitationsSent(supabase, tournamentId),
        [tournamentId]
      ),
      [tournamentId]
    );

  const handleRevoke = async () => {
    if (!selectedInvitationId) return;

    setIsLoading(true);
    try {
      // Note: revoke mutation would need to be added to the backend
      toast.info("Revoke functionality coming soon");
    } catch (error) {
      toast.error("Failed to revoke invitation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
      setRevokeDialogOpen(false);
      setSelectedInvitationId(null);
    }
  };

  const handleResend = async (_invitationId: string) => {
    try {
      // Note: resend mutation would need to be added to the backend
      toast.info("Resend functionality coming soon");
    } catch (error) {
      toast.error("Failed to resend invitation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const openRevokeDialog = (invitationId: string) => {
    setSelectedInvitationId(invitationId);
    setRevokeDialogOpen(true);
  };

  if (isLoadingInvitations) {
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

  // Transform data to match our interface
  const transformedInvitations: InvitationData[] = (invitations ?? []).map(
    (inv) => ({
      id: inv.id,
      status: inv.status as InvitationStatus,
      message: inv.message ?? undefined,
      invited_at: inv.invited_at ?? new Date().toISOString(),
      expires_at: inv.expires_at,
      responded_at: inv.responded_at,
      invitedPlayer: inv.invitedPlayer,
    })
  );

  // Group invitations by status
  const pendingInvitations = transformedInvitations.filter(
    (inv) => inv.status === "pending"
  );
  const respondedInvitations = transformedInvitations.filter(
    (inv) => inv.status !== "pending"
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Tournament Invitations
              </CardTitle>
              <CardDescription>
                Manage invitations sent to players
              </CardDescription>
            </div>
            <Badge variant="outline">{pendingInvitations.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {transformedInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Send className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                No invitations sent yet
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Use the invite form to send invitations to players
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Awaiting Response
                    </h4>
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => (
                        <InvitationItem
                          key={invitation.id}
                          invitation={invitation}
                          showActions={showActions}
                          onResend={handleResend}
                          onRevoke={openRevokeDialog}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Responded Invitations */}
                {respondedInvitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Responded
                    </h4>
                    <div className="space-y-2">
                      {respondedInvitations.map((invitation) => (
                        <InvitationItem
                          key={invitation.id}
                          invitation={invitation}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation. The player will no longer be able
              to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface InvitationItemProps {
  invitation: InvitationData;
  showActions?: boolean;
  onResend?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

function InvitationItem({
  invitation,
  showActions = false,
  onResend,
  onRevoke,
}: InvitationItemProps) {
  // Check if invitation is expired
  const isExpired =
    invitation.expires_at && new Date(invitation.expires_at) < new Date();
  const effectiveStatus =
    isExpired && invitation.status === "pending"
      ? "expired"
      : invitation.status;
  const effectiveConfig = statusConfig[effectiveStatus];
  const StatusIcon = effectiveConfig.icon;

  const invitedAtTime = new Date(invitation.invited_at).getTime();
  const respondedAtTime = invitation.responded_at
    ? new Date(invitation.responded_at).getTime()
    : null;

  return (
    <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
      <div className="flex items-center gap-3">
        {invitation.invitedPlayer ? (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={invitation.invitedPlayer.avatarUrl ?? undefined}
              />
              <AvatarFallback>
                {invitation.invitedPlayer.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {invitation.invitedPlayer.displayName}
              </p>
              <p className="text-muted-foreground text-xs">
                @{invitation.invitedPlayer.username}
              </p>
            </div>
          </>
        ) : (
          <>
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                <UserX className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm">Unknown player</p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant={effectiveConfig.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {effectiveConfig.label}
          </Badge>
          <p className="text-muted-foreground mt-1 text-xs">
            {respondedAtTime
              ? `Responded ${formatDistanceToNow(respondedAtTime, { addSuffix: true })}`
              : `Sent ${formatDistanceToNow(invitedAtTime, { addSuffix: true })}`}
          </p>
        </div>

        {showActions && invitation.status === "pending" && !isExpired && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onResend?.(invitation.id)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resend Invitation
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRevoke?.(invitation.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke Invitation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
