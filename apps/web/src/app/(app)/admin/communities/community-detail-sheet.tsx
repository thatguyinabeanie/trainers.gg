"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  type CommunityRow,
  communityStatusLabels,
  communityTierLabels,
} from "./columns";
import {
  approveCommunityAction,
  rejectCommunityAction,
  suspendCommunityAction,
  unsuspendCommunityAction,
  transferOwnershipAction,
} from "./actions";

// --- Status and tier badge styles (reused from columns for consistency) ---

const communityStatusClasses: Record<CommunityRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  active:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  suspended: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
};

const communityTierClasses: Record<CommunityRow["tier"], string> = {
  regular: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  verified:
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  partner:
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
};

// --- Helper ---

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- Confirmation dialog types ---

type ConfirmAction =
  | { type: "approve" }
  | { type: "reject" }
  | { type: "suspend" }
  | { type: "unsuspend" }
  | { type: "transfer" };

// --- Props ---

interface CommunityDetailSheetProps {
  community: CommunityRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Component ---

export function CommunityDetailSheet({
  community,
  open,
  onOpenChange,
}: CommunityDetailSheetProps) {
  const router = useRouter();

  // Form state
  const [reason, setReason] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );

  // Reset form state when the sheet opens/closes or community changes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason("");
      setNewOwnerId("");
      setError(null);
      setSuccess(null);
      setConfirmAction(null);
    }
    onOpenChange(nextOpen);
  };

  // --- Action handlers ---

  const handleConfirm = async () => {
    if (!community || !confirmAction) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    let result: { success: boolean; error?: string };

    switch (confirmAction.type) {
      case "approve":
        result = await approveCommunityAction(community.id);
        break;
      case "reject":
        result = await rejectCommunityAction(community.id, reason);
        break;
      case "suspend":
        result = await suspendCommunityAction(community.id, reason);
        break;
      case "unsuspend":
        result = await unsuspendCommunityAction(community.id);
        break;
      case "transfer":
        result = await transferOwnershipAction(community.id, newOwnerId);
        break;
    }

    setLoading(false);
    setConfirmAction(null);

    if (!result.success) {
      setError(result.error ?? "An unexpected error occurred");
      return;
    }

    // Show a brief success message, then close and refresh
    const messages: Record<ConfirmAction["type"], string> = {
      approve: "Community approved",
      reject: "Community rejected",
      suspend: "Community suspended",
      unsuspend: "Community unsuspended",
      transfer: "Ownership transferred",
    };
    setSuccess(messages[confirmAction.type]);

    // Reset form fields after a successful action
    setReason("");
    setNewOwnerId("");

    // Refresh the page data
    router.refresh();
  };

  // --- Confirmation dialog labels ---

  function getConfirmTitle(): string {
    if (!confirmAction) return "";
    const titles: Record<ConfirmAction["type"], string> = {
      approve: "Approve Community",
      reject: "Reject Community",
      suspend: "Suspend Community",
      unsuspend: "Unsuspend Community",
      transfer: "Transfer Ownership",
    };
    return titles[confirmAction.type];
  }

  function getConfirmDescription(): string {
    if (!confirmAction || !community) return "";
    const descriptions: Record<ConfirmAction["type"], string> = {
      approve: `This will set "${community.name}" to active status. The community will be publicly visible.`,
      reject: `This will reject "${community.name}". The reason will be stored in admin notes.`,
      suspend: `This will suspend "${community.name}". The community will be hidden from public view.`,
      unsuspend: `This will reactivate "${community.name}" and set the status back to active.`,
      transfer: `This will transfer ownership of "${community.name}" to a different user. This action cannot be easily undone.`,
    };
    return descriptions[confirmAction.type];
  }

  function isDestructiveAction(): boolean {
    if (!confirmAction) return false;
    return ["reject", "suspend", "transfer"].includes(confirmAction.type);
  }

  if (!community) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{community.name}</SheetTitle>
            <SheetDescription>{community.slug}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 pb-4">
            {/* Feedback messages */}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                {success}
              </div>
            )}

            {/* --- Info section --- */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Details</h3>

              {/* Status + Tier */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(communityStatusClasses[community.status])}
                >
                  {communityStatusLabels[community.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(communityTierClasses[community.tier])}
                >
                  {communityTierLabels[community.tier]}
                </Badge>
              </div>

              {/* Description */}
              {community.description && (
                <p className="text-muted-foreground text-sm">
                  {community.description}
                </p>
              )}

              {/* Owner */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Owner</Label>
                {community.owner ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={community.owner.image ?? undefined} />
                      <AvatarFallback>
                        {community.owner.username?.charAt(0).toUpperCase() ??
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">@{community.owner.username}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">--</span>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Created
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(community.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Updated
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(community.updated_at)}
                  </p>
                </div>
              </div>
            </section>

            {/* --- Admin Notes section --- */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Admin Notes</h3>
              {community.community_admin_notes?.[0]?.notes ? (
                <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {community.community_admin_notes[0].notes}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No admin notes for this community.
                </p>
              )}
            </section>

            {/* --- Actions section --- */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Actions</h3>

              {/* Status-dependent actions */}
              {community.status === "pending" && (
                <div className="space-y-3">
                  {/* Approve */}
                  <Button
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "approve" })}
                    disabled={loading}
                  >
                    Approve Community
                  </Button>

                  {/* Reject (needs reason) */}
                  <div className="space-y-2">
                    <Label htmlFor="reject-reason">Rejection Reason</Label>
                    <Textarea
                      id="reject-reason"
                      placeholder="Explain why this community is being rejected..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setConfirmAction({ type: "reject" })}
                      disabled={loading || !reason.trim()}
                    >
                      Reject Community
                    </Button>
                  </div>
                </div>
              )}

              {community.status === "active" && (
                <div className="space-y-2">
                  <Label htmlFor="suspend-reason">Suspension Reason</Label>
                  <Textarea
                    id="suspend-reason"
                    placeholder="Explain why this community is being suspended..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "suspend" })}
                    disabled={loading || !reason.trim()}
                  >
                    Suspend Community
                  </Button>
                </div>
              )}

              {community.status === "suspended" && (
                <Button
                  className="w-full"
                  onClick={() => setConfirmAction({ type: "unsuspend" })}
                  disabled={loading}
                >
                  Unsuspend Community
                </Button>
              )}

              {/* Transfer ownership (available for all statuses) */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-owner-id">Transfer Ownership</Label>
                  <Input
                    id="new-owner-id"
                    placeholder="New owner user ID..."
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "transfer" })}
                    disabled={loading || !newOwnerId.trim()}
                  >
                    Transfer Ownership
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              variant={isDestructiveAction() ? "destructive" : "default"}
            >
              {loading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
