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
import { NotificationPopup } from "@/components/notifications/notification-popup";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface NotificationBellProps {
  userId?: string;
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
  const [tab, setTab] = useState<"notifications" | "invitations">(
    "notifications"
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

  const {
    data: invitations,
    refetch: refetchInvitations,
    isLoading: invitationsLoading,
  } = useSupabaseQuery(invitationsQueryFn, [userId, refreshKey]);

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
            if (row.action_url) {
              n.onclick = () => {
                window.focus();
                window.location.href = row.action_url!;
              };
            }
          }
        }
      )
      .subscribe();

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
    if (actionUrl) {
      setOpen(false);
      router.push(actionUrl);
    }
  };

  const handleInvitationHandled = () => {
    setRefreshKey((k) => k + 1);
    refetchInvitations();
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
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex gap-4">
            <button
              onClick={() => setTab("notifications")}
              className={cn(
                "text-sm font-medium",
                tab === "notifications"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Notifications
              {(unreadCount ?? 0) > 0 && (
                <span className="ml-1 text-xs text-red-500">
                  ({unreadCount})
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("invitations")}
              className={cn(
                "text-sm font-medium",
                tab === "invitations"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Invitations
              {(invitations?.length ?? 0) > 0 && (
                <span className="ml-1 text-xs text-red-500">
                  ({invitations?.length})
                </span>
              )}
            </button>
          </div>
          {tab === "notifications" && (unreadCount ?? 0) > 0 && (
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

        {/* Content */}
        {tab === "notifications" ? (
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
            ) : !notifications || notifications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const IconComponent = notificationIcons[n.type ?? ""] ?? Bell;
                const isRead = n.read_at !== null;

                return (
                  <button
                    key={n.id}
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
              })
            )}
          </div>
        ) : (
          <NotificationPopup
            invitations={invitations ?? []}
            onInvitationHandled={handleInvitationHandled}
          />
        )}
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
