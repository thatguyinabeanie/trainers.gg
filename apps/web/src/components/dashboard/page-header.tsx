"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

/**
 * Dashboard page header — renders inside the SidebarInset header bar.
 * Shows the sidebar trigger, separator, and an optional page title.
 * Each page renders this as its first element.
 */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      {title && <span className="text-sm font-medium">{title}</span>}
      {children}
    </header>
  );
}
