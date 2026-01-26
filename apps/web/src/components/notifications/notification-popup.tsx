"use client";

import { useState } from "react";
import { Building2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSupabase } from "@/lib/supabase";
import {
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
} from "@trainers/supabase";

interface OrganizationInvitation {
  id: number;
  organization: {
    id: number;
    name: string;
    slug: string;
  } | null;
  invited_by: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
  created_at: string | null;
}

interface NotificationPopupProps {
  invitations: OrganizationInvitation[];
  onInvitationHandled: () => void;
}

export function NotificationPopup({
  invitations,
  onInvitationHandled,
}: NotificationPopupProps) {
  const supabase = useSupabase();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAccept = async (invitationId: number, orgName: string) => {
    setLoadingId(invitationId);
    try {
      await acceptOrganizationInvitation(supabase, invitationId);
      toast.success(`You are now staff of ${orgName}`);
      onInvitationHandled();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (invitationId: number, orgName: string) => {
    setLoadingId(invitationId);
    try {
      await declineOrganizationInvitation(supabase, invitationId);
      toast.success(`Declined invitation from ${orgName}`);
      onInvitationHandled();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to decline invitation"
      );
    } finally {
      setLoadingId(null);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm">No new notifications</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[400px] flex-col overflow-y-auto">
      {invitations.map((invitation) => {
        const orgName = invitation.organization?.name ?? "Unknown Organization";
        const isLoading = loadingId === invitation.id;

        return (
          <div key={invitation.id} className="border-b p-4 last:border-b-0">
            <div className="mb-3 flex items-start gap-3">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Building2 className="text-primary h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{orgName}</p>
                <p className="text-muted-foreground text-sm">
                  invited you to join their staff
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                disabled={isLoading}
                onClick={() => handleAccept(invitation.id, orgName)}
              >
                {isLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => handleReject(invitation.id, orgName)}
              >
                {isLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-1 h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
