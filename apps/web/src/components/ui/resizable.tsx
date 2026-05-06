"use client";

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

/**
 * Resizable handle with two variants:
 *
 * - `variant="visible"` (default): Standard always-visible border separator.
 * - `variant="ghost"`: Invisible by default, reveals a colored bar on hover/drag.
 *   Inspired by Jira's seamless side-panel resize UX.
 */
function ResizableHandle({
  withHandle,
  variant = "visible",
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
  variant?: "visible" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <Separator
        data-slot="resizable-handle"
        className={cn(
          // Invisible by default — wide hit area, no visible border
          "group/handle relative flex w-0 items-center justify-center",
          // Wide hover/grab zone via pseudo-element
          "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
          "cursor-col-resize",
          // Vertical direction support
          "data-[panel-group-direction=vertical]:h-0 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
          "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2",
          // Focus ring
          "focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
          className
        )}
        {...props}
      >
        {/* The visible bar — only appears on hover or while dragging (data-separator="active") */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full",
            "bg-transparent transition-colors duration-150",
            "group-hover/handle:bg-primary",
            "group-data-[separator=active]/handle:bg-primary"
          )}
        />
      </Separator>
    );
  }

  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-6 w-1 shrink-0 rounded-lg" />
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
