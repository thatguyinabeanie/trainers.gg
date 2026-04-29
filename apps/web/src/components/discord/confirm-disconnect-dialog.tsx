"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { disconnectDiscordServerAction } from "@/actions/discord-integration";
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
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

interface ConfirmDisconnectDialogProps {
  serverId: number;
  /** Subset of AppRouterInstance — only refresh() is needed. */
  router: { refresh: () => void };
}

// =============================================================================
// Component
// =============================================================================

export function ConfirmDisconnectDialog({
  serverId,
  router,
}: ConfirmDisconnectDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await disconnectDiscordServerAction(serverId);
      if (result.success) {
        toast.success("Beanie Bot disconnected");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to disconnect Discord server");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        Disconnect
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Beanie Bot?</AlertDialogTitle>
          <AlertDialogDescription>
            All channel mappings, DM settings, and role assignments will be
            deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Disconnecting…" : "Disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
