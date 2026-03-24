"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type OrgRequestRow, requestStatusLabels } from "./columns";
import { approveOrgRequestAction, rejectOrgRequestAction } from "./actions";

const requestStatusClasses: Record<OrgRequestRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  approved:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ConfirmAction = { type: "approve" } | { type: "reject" };

interface RequestDetailSheetProps {
  request: OrgRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailSheet({
  request,
  open,
  onOpenChange,
}: RequestDetailSheetProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );

  // Reset state when request changes
  useEffect(() => {
    setRejectReason("");
    setConfirmAction(null);
  }, [request?.id]);

  if (!request) return null;

  const isPending = request.status === "pending";

  async function handleConfirm() {
    if (!request || !confirmAction) return;
    setIsSubmitting(true);

    try {
      let result;
      if (confirmAction.type === "approve") {
        result = await approveOrgRequestAction(request.id);
      } else {
        result = await rejectOrgRequestAction(request.id, rejectReason);
      }

      if (result.success) {
        toast.success(
          confirmAction.type === "approve"
            ? "Request approved — organization created"
            : "Request rejected"
        );
        setConfirmAction(null);
        setRejectReason("");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{request.name}</SheetTitle>
            <SheetDescription>
              Organization request &middot; {request.slug}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status */}
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Status
              </p>
              <Badge
                variant="outline"
                className={cn(requestStatusClasses[request.status])}
              >
                {requestStatusLabels[request.status]}
              </Badge>
            </div>

            {/* Requester */}
            {request.requester && (
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  Requester
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={request.requester.image ?? undefined} />
                    <AvatarFallback>
                      {request.requester.username?.charAt(0).toUpperCase() ??
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      @{request.requester.username}
                    </p>
                    {request.requester.email && (
                      <p className="text-muted-foreground text-xs">
                        {request.requester.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {request.description && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Description
                </p>
                <p className="text-sm">{request.description}</p>
              </div>
            )}

            {/* Dates */}
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Submitted
              </p>
              <p className="text-sm">{formatDateTime(request.created_at)}</p>
            </div>

            {request.reviewed_at && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Reviewed
                </p>
                <p className="text-sm">{formatDateTime(request.reviewed_at)}</p>
              </div>
            )}

            {request.admin_notes && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Admin Notes
                </p>
                <p className="rounded-lg bg-gray-500/10 p-3 text-sm">
                  {request.admin_notes}
                </p>
              </div>
            )}

            {/* Actions (only for pending) */}
            {isPending && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Actions
                </p>
                <Button
                  className="w-full"
                  onClick={() => setConfirmAction({ type: "approve" })}
                >
                  Approve Request
                </Button>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "reject" })}
                    disabled={!rejectReason.trim()}
                  >
                    Reject Request
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "approve"
                ? "Approve this request?"
                : "Reject this request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? `This will create the organization "${request.name}" and notify the requester.`
                : `This will reject the request and notify the requester. They can reapply after 7 days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting
                ? "Processing..."
                : confirmAction?.type === "approve"
                  ? "Approve"
                  : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
