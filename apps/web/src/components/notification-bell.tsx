"use client";

import { useCallback, useState } from "react";
import { Bell } from "lucide-react";
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

  const { data: invitations, refetch } = useSupabaseQuery(invitationsQueryFn, [
    userId,
    refreshKey,
  ]);

  const count = invitations?.length ?? 0;
  const hasNotifications = count > 0;

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
        <NotificationPopup
          invitations={invitations ?? []}
          onInvitationHandled={handleInvitationHandled}
        />
      </PopoverContent>
    </Popover>
  );
}
