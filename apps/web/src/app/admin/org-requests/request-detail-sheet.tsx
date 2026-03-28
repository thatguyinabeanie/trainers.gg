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
} from "./columns";
import { approveOrgRequestAction, rejectOrgRequestAction } from "./actions";
import {
  SOCIAL_LINK_PLATFORMS,
  type SocialLinkPlatform,
} from "@trainers/validators";

const communityRequestStatusClasses: Record<
  CommunityRequestRow["status"],
  string
> = {
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
        result = await approveOrgRequestAction(request.id);
      } else {
        result = await rejectOrgRequestAction(request.id, rejectReason);
      }

      if (result.success) {
        toast.success(
          confirmAction.type === "approve"
            ? "Request approved — community created"
            : "Request rejected"
        );
        setConfirmAction(null);
        setRejectReason("");
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
            {/* Details section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Details</h3>

              {/* Status + Requester row */}
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

              {/* Description */}
              {request.description && (
                <p className="text-muted-foreground text-sm">
                  {request.description}
                </p>
              )}

              {/* Dates */}
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

            {/* Community Links */}
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

            {/* Admin Notes */}
            {request.admin_notes && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Admin Notes</h3>
                <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {request.admin_notes}
                </p>
              </section>
            )}

            {/* Actions (only for pending) */}
            {isPending && (
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
