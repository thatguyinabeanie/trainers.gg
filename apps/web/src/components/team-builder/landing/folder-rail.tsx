"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, FolderOpen, FolderPlus, MoreHorizontal, Trash2, Zap } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { ARCHIVED_VIEW_ID } from "./group-drafts";
import { type ManualFolder, type SmartFolder } from "../persistence/local-folders-types";

// =============================================================================
// Types
// =============================================================================

export interface FolderRailProps {
  /** null = "All teams" view; ARCHIVED_VIEW_ID = archived view; else folder id */
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  manualFolders: readonly ManualFolder[];
  smartFolders: readonly SmartFolder[];
  counts: {
    all: number;
    archived: number;
    manual: Record<string, number>;
    smart: Record<string, number>;
  };
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateManualFolder: (name: string) => void;
  onDeleteManualFolder?: (id: string) => void;
  /** Parent opens the criteria-builder dialog when called */
  onCreateSmartFolder?: () => void;
}

// =============================================================================
// Internal helpers
// =============================================================================

/** Keyboard shortcut: Cmd+\ (Mac) or Ctrl+\ (Windows/Linux) */
const COLLAPSE_KEY = "\\";

interface RailItemProps {
  id: string | null;
  label: string;
  count: number;
  icon?: React.ReactNode;
  isActive: boolean;
  onSelect: () => void;
  /** Optional actions rendered on hover (manual folder delete menu) */
  actions?: React.ReactNode;
  collapsed?: boolean;
}

function RailItem({
  id: _id,
  label,
  count,
  icon,
  isActive,
  onSelect,
  actions,
  collapsed = false,
}: RailItemProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 transition-colors",
        // Larger tap target: 40px min-height on mobile, 32px on sm+
        "min-h-10 sm:min-h-8",
        isActive
          ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
          : "text-foreground hover:bg-accent/60"
      )}
    >
      {/* Main clickable area */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2"
        onClick={onSelect}
        aria-pressed={isActive}
        aria-label={label}
      >
        {icon && (
          <span className="shrink-0 opacity-70" aria-hidden>
            {icon}
          </span>
        )}
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        )}
        {!collapsed && (
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto shrink-0 text-xs tabular-nums",
              isActive && "bg-teal-500/20 text-teal-700 dark:text-teal-400"
            )}
          >
            {count}
          </Badge>
        )}
      </button>

      {/* Actions (shown on hover when not collapsed) */}
      {!collapsed && actions && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Droppable wrapper for manual folder rail nodes (§10.3)
//
// Only MANUAL folders are drop targets — auto/smart/system nodes don't accept
// team drops. useDroppable must live inside a component, not a .map() callback.
// =============================================================================

interface DroppableRailItemProps extends Omit<RailItemProps, "id"> {
  /** The manual folder's id (e.g. "folder-*" / "dbfolder-*") */
  folderId: string;
}

function DroppableRailItem({ folderId, ...railProps }: DroppableRailItemProps) {
  // id scheme: "folder-drop-{folderId}" — matched by prefix in the orchestrator's onDragEnd
  const { setNodeRef, isOver } = useDroppable({ id: `folder-drop-${folderId}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md transition-colors",
        // Drop-active highlight — ring appears only while a drag hovers over this node
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      <RailItem id={folderId} {...railProps} />
    </div>
  );
}

// =============================================================================
// New folder inline input
// =============================================================================

interface NewFolderInputProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function NewFolderInput({ onSubmit, onCancel }: NewFolderInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        onSubmit(trimmed);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="px-2 py-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Submit on blur if there's a non-empty value
          const trimmed = value.trim();
          if (trimmed.length > 0) {
            onSubmit(trimmed);
          } else {
            onCancel();
          }
        }}
        placeholder="Folder name…"
        aria-label="New folder name"
        className="h-7 text-xs"
      />
    </div>
  );
}

// =============================================================================
// FolderRail
// =============================================================================

/**
 * Left sidebar rail for the team-builder landing.
 *
 * Controlled component — all selection and mutation state lives outside.
 * Shows: All teams, Smart folders (seeded + user), Manual folders, Archived.
 *
 * Supports collapse toggle via button and ⌘\ / Ctrl+\ shortcut.
 * Collapsed state renders icons-only strip.
 *
 * Mobile: renders normally at full width (bottom-sheet treatment comes
 * in Milestone C). The rail itself is flex-column so it doesn't cause
 * horizontal overflow when embedded in a layout.
 */
export function FolderRail({
  selectedFolderId,
  onSelect,
  manualFolders,
  smartFolders,
  counts,
  collapsed,
  onToggleCollapsed,
  onCreateManualFolder,
  onDeleteManualFolder,
  onCreateSmartFolder,
}: FolderRailProps) {
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Global keyboard shortcut: Cmd+\ or Ctrl+\
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === COLLAPSE_KEY && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggleCollapsed();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleCollapsed]);

  function handleCreateFolder(name: string) {
    setShowNewFolderInput(false);
    onCreateManualFolder(name);
  }

  function handleCancelNewFolder() {
    setShowNewFolderInput(false);
  }

  return (
    <nav
      className={cn(
        "flex flex-col gap-0.5",
        collapsed ? "w-10" : "w-52"
      )}
      aria-label="Folders"
    >
      {/* Collapse toggle */}
      <div className={cn("mb-1 flex", collapsed ? "justify-center px-0" : "justify-end px-2")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "size-8 p-0 text-muted-foreground hover:text-foreground",
            // 40px tap target on mobile
            "min-h-10 sm:min-h-8"
          )}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘\\)`}
        >
          <ChevronLeft
            className={cn("size-4 transition-transform", collapsed && "rotate-180")}
            aria-hidden
          />
        </Button>
      </div>

      {/* All teams */}
      <RailItem
        id={null}
        label="All teams"
        count={counts.all}
        icon={<FolderOpen className="size-4" />}
        isActive={selectedFolderId === null}
        onSelect={() => onSelect(null)}
        collapsed={collapsed}
      />

      {/* Smart folders */}
      {!collapsed && (
        <div className="mt-2 mb-0.5 px-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Smart
          </span>
        </div>
      )}
      {smartFolders.map((folder) => (
        <RailItem
          key={folder.id}
          id={folder.id}
          label={folder.name}
          count={counts.smart[folder.id] ?? 0}
          icon={<Zap className="size-3.5" />}
          isActive={selectedFolderId === folder.id}
          onSelect={() => onSelect(folder.id)}
          collapsed={collapsed}
        />
      ))}
      {/* + New smart folder */}
      {!collapsed && onCreateSmartFolder && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent/40 min-h-10 sm:min-h-8"
          onClick={onCreateSmartFolder}
          aria-label="New smart folder"
        >
          <Zap className="size-3.5" aria-hidden />
          + New smart folder
        </button>
      )}

      {/* Manual folders */}
      {!collapsed && (
        <div className="mt-2 mb-0.5 px-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </span>
        </div>
      )}
      {/* Manual folder nodes — each is a droppable drop target (§10.3).
          DroppableRailItem wraps RailItem so useDroppable is called per-component,
          not inside a .map() callback (Rules of Hooks). */}
      {manualFolders.map((folder) => (
        <DroppableRailItem
          key={folder.id}
          folderId={folder.id}
          label={folder.name}
          count={counts.manual[folder.id] ?? 0}
          icon={<FolderOpen className="size-3.5" />}
          isActive={selectedFolderId === folder.id}
          onSelect={() => onSelect(folder.id)}
          collapsed={collapsed}
          actions={
            onDeleteManualFolder ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="text-muted-foreground hover:text-foreground flex min-h-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-7 sm:min-h-8"
                  aria-label={`Options for ${folder.name}`}
                >
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4}>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteManualFolder(folder.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      ))}

      {/* Inline new folder input / trigger */}
      {!collapsed && (
        showNewFolderInput ? (
          <NewFolderInput
            onSubmit={handleCreateFolder}
            onCancel={handleCancelNewFolder}
          />
        ) : (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent/40 min-h-10 sm:min-h-8"
            onClick={() => setShowNewFolderInput(true)}
            aria-label="New folder"
          >
            <FolderPlus className="size-3.5" aria-hidden />
            + New folder
          </button>
        )
      )}

      {/* Archived */}
      <div className={cn(!collapsed && "mt-2")}>
        <RailItem
          id={ARCHIVED_VIEW_ID}
          label="Archived"
          count={counts.archived}
          icon={<span aria-hidden className="text-sm">🗄</span>}
          isActive={selectedFolderId === ARCHIVED_VIEW_ID}
          onSelect={() => onSelect(ARCHIVED_VIEW_ID)}
          collapsed={collapsed}
        />
      </div>
    </nav>
  );
}
