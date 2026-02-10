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
import { type OrgRow, orgStatusLabels, orgTierLabels } from "./columns";
import {
  approveOrgAction,
  rejectOrgAction,
  suspendOrgAction,
  unsuspendOrgAction,
  transferOwnershipAction,
} from "./actions";

// --- Status and tier badge styles (reused from columns for consistency) ---

const orgStatusClasses: Record<OrgRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  active:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  suspended: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
};

const orgTierClasses: Record<OrgRow["tier"], string> = {
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

interface OrgDetailSheetProps {
  org: OrgRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Component ---

export function OrgDetailSheet({
  org,
  open,
  onOpenChange,
}: OrgDetailSheetProps) {
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

  // Reset form state when the sheet opens/closes or org changes
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
    if (!org || !confirmAction) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    let result: { success: boolean; error?: string };

    switch (confirmAction.type) {
      case "approve":
        result = await approveOrgAction(org.id);
        break;
      case "reject":
        result = await rejectOrgAction(org.id, reason);
        break;
      case "suspend":
        result = await suspendOrgAction(org.id, reason);
        break;
      case "unsuspend":
        result = await unsuspendOrgAction(org.id);
        break;
      case "transfer":
        result = await transferOwnershipAction(org.id, newOwnerId);
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
      approve: "Organization approved",
      reject: "Organization rejected",
      suspend: "Organization suspended",
      unsuspend: "Organization unsuspended",
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
      approve: "Approve Organization",
      reject: "Reject Organization",
      suspend: "Suspend Organization",
      unsuspend: "Unsuspend Organization",
      transfer: "Transfer Ownership",
    };
    return titles[confirmAction.type];
  }

  function getConfirmDescription(): string {
    if (!confirmAction || !org) return "";
    const descriptions: Record<ConfirmAction["type"], string> = {
      approve: `This will set "${org.name}" to active status. The organization will be publicly visible.`,
      reject: `This will reject "${org.name}". The reason will be stored in admin notes.`,
      suspend: `This will suspend "${org.name}". The organization will be hidden from public view.`,
      unsuspend: `This will reactivate "${org.name}" and set the status back to active.`,
      transfer: `This will transfer ownership of "${org.name}" to a different user. This action cannot be easily undone.`,
    };
    return descriptions[confirmAction.type];
  }

  function isDestructiveAction(): boolean {
    if (!confirmAction) return false;
    return ["reject", "suspend", "transfer"].includes(confirmAction.type);
  }

  if (!org) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{org.name}</SheetTitle>
            <SheetDescription>{org.slug}</SheetDescription>
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
                  className={cn(orgStatusClasses[org.status])}
                >
                  {orgStatusLabels[org.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(orgTierClasses[org.tier])}
                >
                  {orgTierLabels[org.tier]}
                </Badge>
              </div>

              {/* Description */}
              {org.description && (
                <p className="text-muted-foreground text-sm">
                  {org.description}
                </p>
              )}

              {/* Owner */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Owner</Label>
                {org.owner ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={org.owner.image ?? undefined} />
                      <AvatarFallback>
                        {org.owner.username?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">@{org.owner.username}</span>
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
                  <p className="text-sm">{formatDateTime(org.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Updated
                  </Label>
                  <p className="text-sm">{formatDateTime(org.updated_at)}</p>
                </div>
              </div>
            </section>

            {/* --- Admin Notes section --- */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Admin Notes</h3>
              {org.admin_notes ? (
                <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {org.admin_notes}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No admin notes for this organization.
                </p>
              )}
            </section>

            {/* --- Actions section --- */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Actions</h3>

              {/* Status-dependent actions */}
              {org.status === "pending" && (
                <div className="space-y-3">
                  {/* Approve */}
                  <Button
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "approve" })}
                    disabled={loading}
                  >
                    Approve Organization
                  </Button>

                  {/* Reject (needs reason) */}
                  <div className="space-y-2">
                    <Label htmlFor="reject-reason">Rejection Reason</Label>
                    <Textarea
                      id="reject-reason"
                      placeholder="Explain why this organization is being rejected..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setConfirmAction({ type: "reject" })}
                      disabled={loading || !reason.trim()}
                    >
                      Reject Organization
                    </Button>
                  </div>
                </div>
              )}

              {org.status === "active" && (
                <div className="space-y-2">
                  <Label htmlFor="suspend-reason">Suspension Reason</Label>
                  <Textarea
                    id="suspend-reason"
                    placeholder="Explain why this organization is being suspended..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "suspend" })}
                    disabled={loading || !reason.trim()}
                  >
                    Suspend Organization
                  </Button>
                </div>
              )}

              {org.status === "suspended" && (
                <Button
                  className="w-full"
                  onClick={() => setConfirmAction({ type: "unsuspend" })}
                  disabled={loading}
                >
                  Unsuspend Organization
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
