"use client";

import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationBellProps {
  count?: number;
}

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const hasNotifications = count > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              // TODO: Open notifications panel
            }}
          >
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
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasNotifications
              ? `${count} unread notifications`
              : "No new notifications"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
