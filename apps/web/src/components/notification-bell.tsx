"use client";

import { useCallback, useState } from "react";
import { Bell, Loader2, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSupabaseQuery } from "@/lib/supabase";
import { getMyOrganizationInvitations } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { NotificationPopup } from "@/components/notifications/notification-popup";

interface NotificationBellProps {
  userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const invitationsQueryFn = useCallback(
    (client: TypedSupabaseClient) => {
      if (!userId) return Promise.resolve([]);
      return getMyOrganizationInvitations(client, userId);
    },
    [userId]
  );

  const {
    data: invitations,
    refetch,
    isLoading,
    error,
  } = useSupabaseQuery(invitationsQueryFn, [userId, refreshKey]);

  const count = invitations?.length ?? 0;
  const hasNotifications = count > 0;
  const hasError = !!error;

  const handleInvitationHandled = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  if (!userId) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="hover:bg-accent relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md">
        <Bell className="h-5 w-5" />
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
        <span className="sr-only">
          {hasNotifications
            ? `${count} unread notifications`
            : "No new notifications"}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-muted-foreground text-sm">
              Failed to load notifications
            </p>
            <button
              onClick={() => refetch()}
              className="text-primary text-sm hover:underline"
            >
              Retry
            </button>
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
