"use client";

import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, Trash2, Pin, PinOff, Archive, ArchiveX, FolderOpen, Check, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getFormatLabel } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  type TeamRowProps,
  type DraftSpeciesSlot,
  draftEditorHref,
} from "./team-landing-shared";

// ---------------------------------------------------------------------------
// Sprite strip — renders up to 6 species sprites
// ---------------------------------------------------------------------------

interface SpriteProps {
  slot: DraftSpeciesSlot;
  index: number;
  highlighted: boolean;
}

function Sprite({ slot, index, highlighted }: SpriteProps) {
  const sprite = getPokemonSprite(slot.species ?? "", { shiny: slot.isShiny });

  return (
    <div
      className={cn(
        "relative size-8 shrink-0 rounded sm:size-9",
        // Subtle teal highlight ring+bg when this species is a search match
        highlighted && "bg-teal-500/10 ring-2 ring-teal-500/40"
      )}
    >
      <Image
        src={sprite.url}
        alt={slot.species ?? `Slot ${index + 1}`}
        width={sprite.w}
        height={sprite.h}
        className={cn(
          "size-full object-contain",
          sprite.pixelated && "image-rendering-pixelated"
        )}
        unoptimized
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamRow
// ---------------------------------------------------------------------------

/**
 * Name-first row for the /builder landing draft list.
 *
 * Layout: [grip?] → [checkbox?] → [name] → [sprites] → [format badge] … [⋯ overflow menu]
 *
 * The main area is a Next.js Link to the draft editor. The overflow menu
 * is a sibling (not nested inside the link) to avoid nested interactive
 * elements. The optional leading Checkbox is also a sibling — it intercepts
 * its own click (with shift-key detection) without hijacking the Link.
 *
 * Optional props (additive — existing behaviour preserved when unset):
 * - `highlightSpecies` — species strings to highlight with a teal ring/bg
 * - `onPeek` — adds a "Peek" item to the overflow menu above Delete
 * - `pinned` / `onTogglePin` — adds Pin/Unpin item when callback is provided
 * - `archived` / `onToggleArchive` — adds Archive/Unarchive item when callback is provided
 * - `manualFolders` / `memberFolderIds` / `onToggleFolder` — adds "Move to folder" submenu
 * - `selectable` / `selected` / `onToggleSelect` — bulk-selection checkbox (Milestone C)
 * - `reorderable` / `canMoveUp` / `canMoveDown` / `onMove` — drag reorder + tap fallback (Milestone C)
 */
export function TeamRow({
  summary,
  onDelete,
  highlightSpecies,
  onPeek,
  pinned,
  archived,
  onTogglePin,
  onToggleArchive,
  manualFolders,
  memberFolderIds,
  onToggleFolder,
  selectable,
  selected,
  onToggleSelect,
  reorderable,
  canMoveUp,
  canMoveDown,
  onMove,
}: TeamRowProps) {
  const highlightSet = new Set(highlightSpecies ?? []);
  const memberSet = new Set(memberFolderIds ?? []);

  // dnd-kit sortable — only active when reorderable; disabled otherwise so the
  // hook is always called (Rules of Hooks) but has no drag behaviour.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: summary.id,
    disabled: !reorderable,
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  // Determine whether the "Move to folder" submenu should appear
  const showFolderMenu =
    onToggleFolder !== undefined &&
    manualFolders !== undefined &&
    manualFolders.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className="group flex items-center gap-2 rounded-lg py-1.5 transition-colors hover:bg-accent/40 sm:gap-3"
    >
      {/* Drag grip handle — shown only when reorderable */}
      {reorderable && (
        // ≥40px tap area on mobile, shrinks to sm: size; hover-revealed on desktop
        <div
          className={cn(
            "flex shrink-0 cursor-grab items-center justify-center active:cursor-grabbing",
            "size-10 sm:size-6",
            // Desktop: hidden by default, revealed on group-hover
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            // Always visible on mobile so touch users can see it
            "sm:opacity-0 sm:group-hover:opacity-100"
          )}
          aria-hidden
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </div>
      )}

      {/* Bulk-selection checkbox — sibling of Link, never nested inside it */}
      {selectable && (
        // Wrapper gives a ≥40px tap target on mobile without inflating layout
        <div
          // On desktop: hidden by default, revealed on group-hover or when selected.
          // On mobile: always visible (the group-hover reveal is a pointer-hover
          // concept; mobile users long-press to enter select-mode first).
          className={cn(
            "flex shrink-0 items-center justify-center size-10 sm:size-6",
            // Desktop: hide until hover/selected; mobile always visible
            "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
            selected && "sm:opacity-100"
          )}
          // Stop the click from bubbling to the row's Link wrapper
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            data-testid={`checkbox-${summary.id}`}
            checked={selected ?? false}
            aria-label={`Select ${summary.name}`}
            // Read shiftKey on the native click event to support range-select
            onClick={(e: React.MouseEvent) => {
              onToggleSelect?.(summary.id, { shift: e.shiftKey });
            }}
          />
        </div>
      )}

      {/* Main clickable area */}
      <Link
        href={draftEditorHref(summary.id)}
        className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
      >
        {/* Name column — fixed width, truncates on overflow */}
        <div className="w-36 min-w-0 shrink-0 sm:w-48">
          <span className="block truncate text-sm font-medium leading-tight">
            {summary.name}
          </span>
        </div>

        {/* Sprite strip */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {summary.filledCount === 0 ? (
            <span className="text-muted-foreground text-xs">Empty</span>
          ) : (
            summary.species.map((slot, i) => (
              <Sprite
                key={`${slot.species ?? "empty"}-${i}`}
                slot={slot}
                index={i}
                highlighted={slot.species !== null && highlightSet.has(slot.species)}
              />
            ))
          )}
        </div>

        {/* Format badge */}
        {summary.format && (
          <div className="shrink-0">
            <Badge variant="secondary" className="text-xs">
              {getFormatLabel(summary.format)}
            </Badge>
          </div>
        )}
      </Link>

      {/* Overflow menu — sibling of Link, not nested inside it */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            // ≥40px tap target on mobile, smaller on sm+
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-8",
            // Keep visible on hover/focus; hidden by default on larger screens
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          )}
          aria-label="Team options"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {/* Peek item — shown only when onPeek is provided */}
          {onPeek && (
            <DropdownMenuItem onClick={() => onPeek(summary.id)}>
              Peek
            </DropdownMenuItem>
          )}

          {/* Move up / Move down — tap/keyboard fallback for drag reorder */}
          {reorderable && onMove && (
            <>
              <DropdownMenuItem
                disabled={!canMoveUp}
                onClick={() => onMove(summary.id, "up")}
              >
                <ArrowUp className="size-4" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canMoveDown}
                onClick={() => onMove(summary.id, "down")}
              >
                <ArrowDown className="size-4" />
                Move down
              </DropdownMenuItem>
            </>
          )}

          {/* Pin / Unpin — shown when onTogglePin is provided */}
          {onTogglePin && (
            <DropdownMenuItem onClick={() => onTogglePin(summary.id)}>
              {pinned ? (
                <>
                  <PinOff className="size-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="size-4" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* Archive / Unarchive — shown when onToggleArchive is provided */}
          {onToggleArchive && (
            <DropdownMenuItem onClick={() => onToggleArchive(summary.id)}>
              {archived ? (
                <>
                  <ArchiveX className="size-4" />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive className="size-4" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* Move to folder submenu — shown when onToggleFolder + manualFolders are provided */}
          {showFolderMenu && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen className="size-4" />
                Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {manualFolders!.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => onToggleFolder!(summary.id, folder.id)}
                  >
                    {memberSet.has(folder.id) && (
                      <Check className="size-3.5 text-teal-600" aria-hidden />
                    )}
                    <span className={cn(!memberSet.has(folder.id) && "pl-5")}>
                      {folder.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Separator before Delete when there are extra actions */}
          {(onPeek || reorderable || onTogglePin || onToggleArchive || showFolderMenu) && (
            <DropdownMenuSeparator />
          )}

          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete?.(summary.id)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
