"use client";

/**
 * bulk-action-bar.tsx
 *
 * Presentational, controlled bulk-action bar for the team-builder landing.
 * Renders at the bottom of the viewport when one or more drafts are selected.
 * Wraps the spec §13.2 action set: Move to folder, Export, Archive, Delete
 * (destructive), and Clear selection.
 *
 * All state lives in the parent — this component fires callbacks only.
 */

import { FolderIcon, ArchiveIcon, Trash2Icon, UploadIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { type ManualFolder } from "../persistence/local-folders-types";

// =============================================================================
// Props
// =============================================================================

export interface BulkActionBarProps {
  /** Number of currently selected drafts. Bar is hidden when 0. */
  selectedCount: number;
  /** Available manual folders to move selected drafts into. */
  manualFolders: readonly ManualFolder[];
  /** Called with the target folder id when the user picks a folder. */
  onMoveToFolder: (folderId: string) => void;
  /** Called when the user clicks Export. */
  onExport: () => void;
  /** Called when the user clicks Archive. */
  onArchive: () => void;
  /** Called when the user clicks Delete (destructive). */
  onDelete: () => void;
  /** Called when the user clicks Clear / Cancel. */
  onClear: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BulkActionBar — sticky bottom bar shown when ≥1 draft is selected.
 *
 * Returns null when selectedCount === 0 so the parent never needs to
 * conditionally render the bar itself.
 */
export function BulkActionBar({
  selectedCount,
  manualFolders,
  onMoveToFolder,
  onExport,
  onArchive,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(
        // Sticky bar pinned at the bottom of the viewport, above any global chrome
        "fixed inset-x-0 bottom-0 z-50",
        // Centered container with horizontal padding
        "flex items-center justify-center px-4 pb-4 pt-3",
        // Background: semi-transparent white, teal-accented bottom border
        "border-t border-teal-200 bg-white/95 backdrop-blur-sm",
        "dark:border-teal-800 dark:bg-neutral-900/95"
      )}
    >
      {/* Inner pill — constrains width on large screens */}
      <div
        className={cn(
          "flex w-full max-w-2xl flex-wrap items-center gap-2",
          "sm:flex-nowrap sm:gap-3"
        )}
      >
        {/* Selection count label */}
        <span
          aria-live="polite"
          aria-atomic="true"
          className="shrink-0 text-sm font-medium text-teal-700 dark:text-teal-400"
        >
          {selectedCount} selected
        </span>

        {/* Divider — hidden on very small screens where items wrap */}
        <span
          aria-hidden="true"
          className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 sm:block"
        />

        {/* Action group */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Move to folder — DropdownMenu listing manualFolders */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Move to folder"
              // Ensure ≥40px touch target on mobile
              className="h-10 sm:h-8"
              render={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Move to folder"
                  className="h-10 gap-1.5 sm:h-8"
                />
              }
            >
              <FolderIcon className="size-4" aria-hidden="true" />
              <span>Move to folder</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start">
              {manualFolders.length === 0 ? (
                <DropdownMenuItem disabled>
                  No folders yet
                </DropdownMenuItem>
              ) : (
                manualFolders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => onMoveToFolder(folder.id)}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            aria-label="Export selected"
            className="h-10 gap-1.5 sm:h-8"
            onClick={onExport}
          >
            <UploadIcon className="size-4" aria-hidden="true" />
            <span>Export</span>
          </Button>

          {/* Archive */}
          <Button
            variant="outline"
            size="sm"
            aria-label="Archive selected"
            className="h-10 gap-1.5 sm:h-8"
            onClick={onArchive}
          >
            <ArchiveIcon className="size-4" aria-hidden="true" />
            <span>Archive</span>
          </Button>

          {/* Delete — destructive variant */}
          <Button
            variant="destructive"
            size="sm"
            aria-label="Delete selected"
            className="h-10 gap-1.5 sm:h-8"
            onClick={onDelete}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            <span>Delete</span>
          </Button>
        </div>

        {/* Clear / Cancel — always on the trailing edge */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear selection"
          className="h-10 shrink-0 gap-1 sm:h-8"
          onClick={onClear}
        >
          <XIcon className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Clear</span>
        </Button>
      </div>
    </div>
  );
}
