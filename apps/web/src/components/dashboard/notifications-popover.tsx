"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getNotifications, markAllNotificationsRead } from "@trainers/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Database } from "@trainers/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

type NotificationType = Database["public"]["Enums"]["notification_type"];

// ---------------------------------------------------------------------------
// Helpers — type classification and icon mapping
// ---------------------------------------------------------------------------

/**
 * "Needs attention" types require user action (persistent until resolved).
 * Everything else is informational (shown in the Recent section).
 */
const ACTION_TYPES: NotificationType[] = ["match_ready", "judge_call"];

const TYPE_ICON: Record<NotificationType, string> = {
  match_ready: "⚔️",
  match_result: "⚔️",
  match_disputed: "⚖️",
  judge_call: "⚖️",
  judge_resolved: "✅",
  tournament_start: "🏆",
  tournament_round: "🏆",
  tournament_complete: "🏆",
  match_no_show: "📋",
  org_request_approved: "✅",
  org_request_rejected: "✅",
};

function getTypeIcon(type: NotificationType): string {
  return TYPE_ICON[type] ?? "🔔";
}

function isActionType(type: NotificationType): boolean {
  return ACTION_TYPES.includes(type);
}

function formatAge(createdAt: string): string {
  return formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false })
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo");
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const notificationsKeys = {
  all: ["notifications"] as const,
  recent: () => [...notificationsKeys.all, "recent"] as const,
};

// ---------------------------------------------------------------------------
// Needs Attention item
// ---------------------------------------------------------------------------

interface AttentionItemProps {
  notification: Notification;
}

function AttentionItem({ notification }: AttentionItemProps) {
  const icon = getTypeIcon(notification.type);

  return (
    <div className="bg-muted/50 mb-1 flex items-start gap-2 rounded-md px-2.5 py-2 last:mb-0">
      <span className="mt-0.5 shrink-0 text-sm" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-tight font-semibold">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
            {notification.body}
          </p>
        )}
        {notification.action_url && (
          <div className="mt-1.5">
            <a
              href={notification.action_url}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-medium transition-colors"
            >
              {notification.type === "match_ready" ? "Go to match →" : "View →"}
            </a>
          </div>
        )}
      </div>
      <span className="text-muted-foreground/60 mt-0.5 shrink-0 text-[9px] tabular-nums">
        {formatAge(notification.created_at)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent item
// ---------------------------------------------------------------------------

interface RecentItemProps {
  notification: Notification;
}

function RecentItem({ notification }: RecentItemProps) {
  const isUnread = notification.read_at === null;
  const icon = getTypeIcon(notification.type);

  return (
    <div className="flex items-start gap-2 border-b px-0 py-2 last:border-b-0">
      {/* Unread indicator dot */}
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          isUnread ? "bg-blue-500" : "bg-transparent"
        )}
        aria-hidden
      />
      <span
        className={cn("shrink-0 text-sm", !isUnread && "opacity-50")}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[12px] leading-tight font-medium",
            !isUnread && "text-muted-foreground"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p
            className={cn(
              "mt-0.5 text-[11px] leading-tight",
              isUnread ? "text-muted-foreground" : "text-muted-foreground/60"
            )}
          >
            {notification.body}
          </p>
        )}
      </div>
      <span
        className={cn(
          "mt-0.5 shrink-0 text-[9px] tabular-nums",
          isUnread ? "text-muted-foreground/60" : "text-muted-foreground/40"
        )}
      >
        {formatAge(notification.created_at)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main popover component
// ---------------------------------------------------------------------------

export function NotificationsPopover() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch recent notifications — last 20, newest first
  const { data: notifications = [] } = useQuery({
    queryKey: notificationsKeys.recent(),
    queryFn: () => getNotifications(supabase, { limit: 20 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => markAllNotificationsRead(supabase),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationsKeys.all,
      });
    },
  });

  // Split into attention (unread action items) vs recent (informational)
  const attentionItems = notifications.filter(
    (n) => isActionType(n.type) && n.read_at === null
  );
  const recentItems = notifications.filter((n) => !isActionType(n.type));

  // Badge = unread action items + unread informational items
  const unreadCount = notifications.filter((n) => n.read_at === null).length;
  const badgeCount = unreadCount > 0 ? Math.min(unreadCount, 99) : 0;

  return (
    <Popover>
      {/* Bell trigger with badge */}
      <PopoverTrigger
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "transition-colors outline-none"
        )}
        aria-label={
          badgeCount > 0
            ? `${badgeCount} unread notification${badgeCount === 1 ? "" : "s"}`
            : "Notifications"
        }
      >
        <Bell className="size-4" />
        {badgeCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] leading-none font-semibold text-white"
            aria-hidden
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </PopoverTrigger>

      {/* Popover panel */}
      <PopoverContent
        className="!w-[380px] !max-w-[380px] !gap-0 !p-0"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
            className={cn(
              "text-[11px] font-medium transition-colors outline-none",
              unreadCount > 0
                ? "text-primary hover:text-primary/80 cursor-pointer"
                : "text-muted-foreground/50 cursor-default"
            )}
          >
            Mark all read
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "468px" }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="text-muted-foreground/40 mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                No notifications yet
              </p>
            </div>
          ) : (
            <>
              {/* Needs attention section */}
              {attentionItems.length > 0 && (
                <div className="px-4 pt-2.5 pb-2">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                    Needs attention
                  </p>
                  {attentionItems.map((n) => (
                    <AttentionItem key={n.id} notification={n} />
                  ))}
                </div>
              )}

              {/* Recent section */}
              {recentItems.length > 0 && (
                <div className="px-4 pt-2.5 pb-3">
                  <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                    Recent
                  </p>
                  {recentItems.map((n) => (
                    <RecentItem key={n.id} notification={n} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
