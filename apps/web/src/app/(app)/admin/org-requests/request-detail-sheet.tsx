"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PlatformIcon,
  SOCIAL_PLATFORM_LABELS,
} from "@/components/communities/social-link-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type CommunityRequestRow,
  communityRequestStatusLabels,
  communityRequestStatusClasses,
} from "./columns";
import {
  grantCommunityRequestAction,
  rejectCommunityRequestAction,
} from "./actions";
import {
  SOCIAL_LINK_PLATFORMS,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { formatDateTime } from "@trainers/utils";

type ConfirmAction = { type: "approve" } | { type: "reject" };

interface RequestDetailSheetProps {
  request: CommunityRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

export function RequestDetailSheet({
  request,
  open,
  onOpenChange,
  onActionComplete,
}: RequestDetailSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveReason, setApproveReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );

  // Reset state when request changes
  useEffect(() => {
    setRejectReason("");
    setApproveReason("");
    setConfirmAction(null);
  }, [request?.id]);

  if (!request) return null;

  const isPending = request.status === "pending";
  const isRejected = request.status === "rejected";
  const canApprove = isPending || isRejected;

  // Collect all links for display
  const allLinks: { platform: string; url: string }[] = [];
  if (request.discord_invite_url) {
    allLinks.push({ platform: "discord", url: request.discord_invite_url });
  }
  if (request.social_links) {
    for (const link of request.social_links) {
      if (link.platform && link.url) {
        allLinks.push(link);
      }
    }
  }

  async function handleConfirm() {
    if (!request || !confirmAction) return;
    setIsSubmitting(true);

    try {
      let result;
      if (confirmAction.type === "approve") {
        const reason = approveReason.trim() || undefined;
        result = await grantCommunityRequestAction(request.id, reason);
      } else {
        result = await rejectCommunityRequestAction(request.id, rejectReason);
      }

      if (result.success) {
        toast.success(
          confirmAction.type === "approve"
            ? "Request approved — community created"
            : "Request rejected"
        );
        setConfirmAction(null);
        setRejectReason("");
        setApproveReason("");
        onOpenChange(false);
        onActionComplete?.();
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
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{request.name}</SheetTitle>
            <SheetDescription>
              Community request &middot; {request.slug}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 pb-4">
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Details</h3>

              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={cn(communityRequestStatusClasses[request.status])}
                >
                  {communityRequestStatusLabels[request.status]}
                </Badge>
                {request.requester && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={request.requester.image ?? undefined} />
                      <AvatarFallback>
                        {request.requester.username?.charAt(0).toUpperCase() ??
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
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
                )}
              </div>

              {request.description && (
                <p className="text-muted-foreground text-sm">
                  {request.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Submitted
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(request.created_at)}
                  </p>
                </div>
                {request.reviewed_at && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">
                      Reviewed
                    </Label>
                    <p className="text-sm">
                      {formatDateTime(request.reviewed_at)}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {allLinks.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Community Links</h3>
                <div className="space-y-1.5">
                  {allLinks.map((link) => {
                    const isKnownPlatform = (
                      SOCIAL_LINK_PLATFORMS as readonly string[]
                    ).includes(link.platform);
                    const platform = isKnownPlatform
                      ? (link.platform as SocialLinkPlatform)
                      : "website";

                    return (
                      <a
                        key={`${link.platform}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:bg-muted flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
                      >
                        <PlatformIcon
                          platform={platform}
                          className="text-primary h-4 w-4 shrink-0"
                        />
                        <span className="truncate">
                          {SOCIAL_PLATFORM_LABELS[platform] ?? link.platform}
                        </span>
                        <ExternalLink className="text-muted-foreground ml-auto h-3 w-3 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {request.admin_notes && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Admin Notes</h3>
                <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {request.admin_notes}
                </p>
              </section>
            )}

            {canApprove && (
              <>
                <Separator />
                <section className="space-y-4">
                  <h3 className="text-sm font-medium">Actions</h3>

                  <Button
                    className="w-full"
                    onClick={() => setConfirmAction({ type: "approve" })}
                  >
                    <Check className="size-4" />
                    Approve Request
                  </Button>

                  {isPending && (
                    <div className="space-y-2">
                      <Label htmlFor="reject-reason">Rejection Reason</Label>
                      <Textarea
                        id="reject-reason"
                        placeholder="Explain why this request is being rejected..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setConfirmAction({ type: "reject" })}
                        disabled={!rejectReason.trim()}
                      >
                        <X className="size-4" />
                        Reject Request
                      </Button>
                    </div>
                  )}
                </section>
              </>
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
                ? `This will create the community "${request.name}" and notify the requester.`
                : `This will reject the request and notify the requester. They can reapply after 7 days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show original rejection reason when approving a previously rejected request */}
          {confirmAction?.type === "approve" &&
            isRejected &&
            request.admin_notes && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Original rejection reason
                </Label>
                <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {request.admin_notes}
                </p>
              </div>
            )}

          {/* Optional reason for approving a rejected request */}
          {confirmAction?.type === "approve" && isRejected && (
            <div className="space-y-2">
              <Label htmlFor="approve-reason">Reason (optional)</Label>
              <Textarea
                id="approve-reason"
                placeholder="Why are you approving this previously rejected request?"
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              variant={
                confirmAction?.type === "reject" ? "destructive" : "default"
              }
            >
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
