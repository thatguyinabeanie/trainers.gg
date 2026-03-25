"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationCount,
} from "@trainers/supabase";
import type { TypedSupabaseClient, Tables } from "@trainers/supabase";
import type { NotificationType } from "@trainers/validators";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@trainers/utils";
import { notificationIcons, isSafeRelativeUrl } from "@/lib/notification-utils";

// -- Type filter tabs --

const FILTER_TABS = [
  { key: "all", label: "All", types: undefined },
  { key: "unread", label: "Unread", types: undefined, unreadOnly: true },
  {
    key: "matches",
    label: "Matches",
    types: ["match_ready", "match_result", "match_disputed", "match_no_show"],
  },
  {
    key: "tournaments",
    label: "Tournaments",
    types: ["tournament_start", "tournament_round", "tournament_complete"],
  },
  {
    key: "organizations",
    label: "Organizations",
    types: ["org_request_approved", "org_request_rejected"],
  },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["key"];

// -- Constants --

const PAGE_SIZE = 20;

// -- Component --

interface NotificationCenterProps {
  initialNotifications: Tables<"notifications">[];
  initialTotalCount: number;
  initialUnreadCount: number;
}

export function NotificationCenter({
  initialNotifications,
  initialTotalCount,
  initialUnreadCount,
}: NotificationCenterProps) {
  const _supabase = useSupabase();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset page when tab changes
  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  // Derive filter options from active tab
  const activeFilter = FILTER_TABS.find((t) => t.key === activeTab);
  const isUnreadOnly = activeTab === "unread";
  const typesFilter =
    activeFilter && "types" in activeFilter
      ? (activeFilter.types as NotificationType[] | undefined)
      : undefined;

  // Fetch notifications for current tab + page
  const notificationsQueryFn = (client: TypedSupabaseClient) =>
    getNotifications(client, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      unreadOnly: isUnreadOnly,
      types: typesFilter,
    });

  const {
    data: notifications,
    refetch: refetchNotifications,
    isLoading,
  } = useSupabaseQuery(notificationsQueryFn, [activeTab, page, refreshKey]);

  // Fetch total count for pagination
  const countQueryFn = (client: TypedSupabaseClient) =>
    getNotificationCount(client, {
      unreadOnly: isUnreadOnly,
      types: typesFilter,
    });

  const { data: totalCount, refetch: refetchCount } = useSupabaseQuery(
    countQueryFn,
    [activeTab, refreshKey]
  );

  // Fetch unread count for the header badge
  const unreadCountQueryFn = (client: TypedSupabaseClient) =>
    getUnreadNotificationCount(client);

  const { data: unreadCount, refetch: refetchUnread } = useSupabaseQuery(
    unreadCountQueryFn,
    [refreshKey]
  );

  // Use initial data on first render, then query data after
  const displayNotifications =
    notifications ??
    (page === 0 && activeTab === "all" ? initialNotifications : []);
  const displayTotalCount =
    totalCount ?? (activeTab === "all" ? initialTotalCount : 0);
  const displayUnreadCount = unreadCount ?? initialUnreadCount;

  const totalPages = Math.max(1, Math.ceil(displayTotalCount / PAGE_SIZE));

  // -- Handlers --

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsReadAction();
    if (result.success) {
      setRefreshKey((k) => k + 1);
      refetchNotifications();
      refetchCount();
      refetchUnread();
      toast.success("All notifications marked as read");
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
      setRefreshKey((k) => k + 1);
    }
    if (isSafeRelativeUrl(actionUrl)) {
      router.push(actionUrl.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Notifications</h2>
          {displayUnreadCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {displayUnreadCount} unread
            </span>
          )}
        </div>
        {displayUnreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="border-b">
        <nav className="flex gap-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Notification list */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : !displayNotifications || displayNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Bell className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              {activeTab === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {displayNotifications.map((n) => {
              const IconComponent = notificationIcons[n.type ?? ""] ?? Bell;
              const isRead = n.read_at !== null;

              return (
                <button
                  key={n.id}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    isRead
                      ? "opacity-60 hover:opacity-80"
                      : "hover:bg-primary/5"
                  )}
                  onClick={() =>
                    handleNotificationClick(n.id, n.action_url, isRead)
                  }
                >
                  {/* Teal left border for unread */}
                  <div
                    className={cn(
                      "w-1 shrink-0 self-stretch rounded-full",
                      !isRead ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  {/* Icon */}
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
                  {/* Content */}
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
                  {/* Unread dot */}
                  {!isRead && (
                    <div className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
