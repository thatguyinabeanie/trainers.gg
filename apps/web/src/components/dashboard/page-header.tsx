"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";

interface PageHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

/**
 * Dashboard page header — renders inside the SidebarInset header bar.
 * Shows the sidebar trigger, separator, page title, optional children,
 * and a notifications bell icon on the right.
 * Each page renders this as its first element.
 */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mx-1 !h-4 !self-center !bg-neutral-300 dark:!bg-neutral-600"
      />
      {title && <span className="text-sm font-medium">{title}</span>}
      {children}
      {/* Notifications bell — pushed to the right */}
      <div className="ml-auto">
        <NotificationsPopover />
      </div>
    </header>
  );
}
