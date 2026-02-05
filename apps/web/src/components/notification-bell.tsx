"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Loader2,
  AlertCircle,
  CheckCheck,
  Swords,
  Trophy,
  ShieldAlert,
  Gavel,
  CirclePlay,
  Flag,
  Building2,
  Check,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getNotifications,
  getUnreadNotificationCount,
  getMyOrganizationInvitations,
} from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
} from "@trainers/supabase";

interface NotificationBellProps {
  userId?: string;
}

function isSafeRelativeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.trim());
  } catch {
    return false;
  }
  // Must start with / and the second char must not be / or \
  return /^\/[^/\\]/.test(decoded);
}

const notificationIcons: Record<string, typeof Swords> = {
  match_ready: Swords,
  match_result: Flag,
  match_disputed: AlertCircle,
  judge_call: ShieldAlert,
  judge_resolved: Gavel,
  tournament_start: CirclePlay,
  tournament_round: Trophy,
  tournament_complete: Trophy,
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingInvitationId, setLoadingInvitationId] = useState<number | null>(
    null
  );

  // Fetch notifications
  const notificationsQueryFn = useCallback(
    (client: TypedSupabaseClient) => {
      if (!userId) return Promise.resolve([]);
      return getNotifications(client, { limit: 20 });
    },
    [userId]
  );

  const {
    data: notifications,
    refetch: refetchNotifications,
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useSupabaseQuery(notificationsQueryFn, [userId, refreshKey]);

  // Fetch unread count
  const unreadCountQueryFn = useCallback(
    (client: TypedSupabaseClient) => {
      if (!userId) return Promise.resolve(0);
      return getUnreadNotificationCount(client);
    },
    [userId]
  );

  const { data: unreadCount, refetch: refetchUnread } = useSupabaseQuery(
    unreadCountQueryFn,
    [userId, refreshKey]
  );

  // Fetch org invitations
  const invitationsQueryFn = useCallback(
    (client: TypedSupabaseClient) => {
      if (!userId) return Promise.resolve([]);
      return getMyOrganizationInvitations(client, userId);
    },
    [userId]
  );

  const { data: invitations, refetch: refetchInvitations } = useSupabaseQuery(
    invitationsQueryFn,
    [userId, refreshKey]
  );

  // Realtime: subscribe to new notifications for this user
  useEffect(() => {
    if (!userId) return;

    const channel: RealtimeChannel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setRefreshKey((k) => k + 1);

          // Browser push notification when tab is not focused
          if (
            document.hidden &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const row = payload.new as {
              title?: string;
              body?: string;
              action_url?: string;
            };
            const n = new Notification(row.title ?? "New notification", {
              body: row.body ?? undefined,
              icon: "/icon-192.png",
              tag: "trainers-notification",
            });
            // Only allow safe relative URLs (no protocol-relative, backslash, or whitespace bypass)
            if (isSafeRelativeUrl(row.action_url)) {
              const url = row.action_url.trim();
              n.onclick = () => {
                window.focus();
                window.location.href = url;
              };
            }
          }
        }
      )
      .subscribe((status, err) => {
        // MVP: console.error is sufficient; a future iteration could show a toast or retry
        if (err) console.error("[notifications] subscribe error:", err);
      });

    // Request notification permission on first load
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const totalCount = (unreadCount ?? 0) + (invitations?.length ?? 0);

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsReadAction();
    if (result.success) {
      refetchNotifications();
      refetchUnread();
    } else {
      toast.error(result.error);
    }
  };

  const handleNotificationClick = async (
    notificationId: number,
    actionUrl: string | null,
    isRead: boolean
  ) => {
    if (!isRead) {
      await markNotificationReadAction(notificationId);
      refetchNotifications();
      refetchUnread();
    }
    if (isSafeRelativeUrl(actionUrl)) {
      setOpen(false);
      router.push(actionUrl.trim());
    }
  };

  const handleAcceptInvitation = async (
    invitationId: number,
    orgName: string
  ) => {
    setLoadingInvitationId(invitationId);
    try {
      await acceptOrganizationInvitation(supabase, invitationId);
      toast.success(`You are now staff of ${orgName}`);
      setRefreshKey((k) => k + 1);
      refetchInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    } finally {
      setLoadingInvitationId(null);
    }
  };

  const handleDeclineInvitation = async (
    invitationId: number,
    orgName: string
  ) => {
    setLoadingInvitationId(invitationId);
    try {
      await declineOrganizationInvitation(supabase, invitationId);
      toast.success(`Declined invitation from ${orgName}`);
      setRefreshKey((k) => k + 1);
      refetchInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to decline invitation"
      );
    } finally {
      setLoadingInvitationId(null);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="hover:bg-accent relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md">
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
        <span className="sr-only">
          {totalCount > 0
            ? `${totalCount} unread notifications`
            : "No new notifications"}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-medium">Notifications</h3>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Unified Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : notificationsError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-muted-foreground text-sm">
                Failed to load notifications
              </p>
              <button
                onClick={() => refetchNotifications()}
                className="text-primary text-sm hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (invitations?.length ?? 0) === 0 &&
            (!notifications || notifications.length === 0) ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground text-sm">
                No notifications yet
              </p>
            </div>
          ) : (
            <>
              {/* Organization Invitations (shown first) */}
              {invitations?.map((invitation) => {
                const orgName =
                  invitation.organization?.name ?? "Unknown Organization";
                const isLoading = loadingInvitationId === invitation.id;

                return (
                  <div
                    key={`invitation-${invitation.id}`}
                    className="border-b px-4 py-3"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <Building2 className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{orgName}</p>
                        <p className="text-muted-foreground text-xs">
                          invited you to join their staff
                        </p>
                        {invitation.created_at && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatTimeAgo(invitation.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        disabled={isLoading}
                        onClick={() =>
                          handleAcceptInvitation(invitation.id, orgName)
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={isLoading}
                        onClick={() =>
                          handleDeclineInvitation(invitation.id, orgName)
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <X className="mr-1 h-3 w-3" />
                        )}
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Regular Notifications */}
              {notifications?.map((n) => {
                const IconComponent = notificationIcons[n.type ?? ""] ?? Bell;
                const isRead = n.read_at !== null;

                return (
                  <button
                    key={`notification-${n.id}`}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0",
                      isRead
                        ? "hover:bg-muted/50"
                        : "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() =>
                      handleNotificationClick(n.id, n.action_url, isRead)
                    }
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !isRead && "font-medium")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {n.body}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                    {!isRead && (
                      <div className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
