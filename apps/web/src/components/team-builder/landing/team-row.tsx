"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MoreHorizontal,
  Trash2,
  Pin,
  PinOff,
  Archive,
  ArchiveX,
  FolderOpen,
  Check,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Cloud,
  Lock,
  Pencil,
  Copy,
  ArrowRightLeft,
  Upload,
  Globe,
  Users,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getFormatLabel } from "@trainers/pokemon";
import { formatTimeAgo } from "@trainers/utils";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/use-is-client";

import {
  type TeamRowProps,
  type DraftSpeciesSlot,
  draftEditorHref,
} from "./team-landing-shared";

// ---------------------------------------------------------------------------
// Sync badge — derives label, icon, and classes from source + auth state
// ---------------------------------------------------------------------------

interface SyncBadgeConfig {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
  title: string;
}

/**
 * Derives the sync badge config from the draft's storage origin and the current
 * auth state. Extracted so both mobile and desktop layouts share identical logic.
 *
 * - "account" → Synced (teal/emerald — DB-backed)
 * - "local" + authed → Local (amber/muted — unsaved draft, can be promoted)
 * - "local" + guest → Local-only (muted — device-only storage)
 */
function syncBadge(
  source: "local" | "account",
  isAuthenticated: boolean | undefined
): SyncBadgeConfig {
  if (source === "account") {
    return {
      label: "Synced",
      Icon: Check,
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs",
      title: "Saved to your account",
    };
  }
  if (isAuthenticated) {
    return {
      label: "Local",
      Icon: Cloud,
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs",
      title: "Unsaved draft — save to an alt",
    };
  }
  return {
    label: "Local-only",
    Icon: Lock,
    className: "border-muted-foreground/30 text-muted-foreground text-xs",
    title: "Saved on this device only",
  };
}

// ---------------------------------------------------------------------------
// Sprite strip — renders up to 6 species sprites
// ---------------------------------------------------------------------------

interface SpriteProps {
  slot: DraftSpeciesSlot;
  index: number;
  highlighted: boolean;
  /** Size class for the sprite container — defaults to `size-6 sm:size-8`. */
  sizeClass?: string;
}

function Sprite({ slot, index, highlighted, sizeClass }: SpriteProps) {
  const sprite = getPokemonSprite(slot.species ?? "", { shiny: slot.isShiny });

  return (
    <div
      className={cn(
        "relative shrink-0 rounded",
        sizeClass ?? "size-6 sm:size-8",
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
// Overflow menu — shared between desktop and mobile layouts
// ---------------------------------------------------------------------------

interface OverflowMenuProps
  extends Pick<
    TeamRowProps,
    | "summary"
    | "onDelete"
    | "onPeek"
    | "pinned"
    | "archived"
    | "onTogglePin"
    | "onToggleArchive"
    | "manualFolders"
    | "memberFolderIds"
    | "onToggleFolder"
    | "reorderable"
    | "canMoveUp"
    | "canMoveDown"
    | "onMove"
    | "alts"
    | "altUsername"
    | "isPublic"
    | "localOnly"
    | "onRename"
    | "onDuplicate"
    | "onMoveToAlt"
    | "onDuplicateToAlt"
    | "onExport"
    | "onMakePublic"
    | "onToggleLocalOnly"
  > {
  /** Additional classes on the trigger button. */
  triggerClassName?: string;
}

function OverflowMenu({
  summary,
  onDelete,
  onPeek,
  pinned,
  archived,
  onTogglePin,
  onToggleArchive,
  manualFolders,
  memberFolderIds,
  onToggleFolder,
  reorderable,
  canMoveUp,
  canMoveDown,
  onMove,
  alts,
  altUsername: _altUsername,
  isPublic,
  localOnly,
  onRename,
  onDuplicate,
  onMoveToAlt,
  onDuplicateToAlt,
  onExport,
  onMakePublic,
  onToggleLocalOnly,
  triggerClassName,
}: OverflowMenuProps) {
  const memberSet = new Set(memberFolderIds ?? []);
  const showFolderMenu =
    onToggleFolder !== undefined &&
    manualFolders !== undefined &&
    manualFolders.length > 0;

  const showMoveToAlt =
    onMoveToAlt !== undefined && alts !== undefined && alts.length > 0;
  const showDuplicateToAlt =
    onDuplicateToAlt !== undefined && alts !== undefined && alts.length > 0;
  const showMakePublic =
    summary.source === "account" && onMakePublic !== undefined;
  const showToggleLocalOnly =
    summary.source === "local" && onToggleLocalOnly !== undefined;

  // True when there will be any item above the destructive separator
  const hasNonDestructiveItems =
    onPeek ||
    reorderable ||
    onRename ||
    onDuplicate ||
    showMoveToAlt ||
    showDuplicateToAlt ||
    onExport ||
    showMakePublic ||
    showToggleLocalOnly ||
    onTogglePin ||
    onToggleArchive ||
    showFolderMenu;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // ≥40px tap target on mobile, smaller on sm+
          "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-8",
          // Keep visible on hover/focus; hidden by default on larger screens
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          triggerClassName
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

        {/* Rename — shown when onRename is provided */}
        {onRename && (
          <DropdownMenuItem onClick={() => onRename(summary.id)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
        )}

        {/* Duplicate — shown when onDuplicate is provided */}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(summary.id)}>
            <Copy className="size-4" />
            Duplicate
          </DropdownMenuItem>
        )}

        {/* Move to alt ▸ submenu — shown when onMoveToAlt + alts are provided */}
        {showMoveToAlt && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="size-4" />
              Move to alt
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {alts!.map((alt) => (
                <DropdownMenuItem
                  key={alt.id}
                  onClick={() => onMoveToAlt!(summary.id, alt.id)}
                >
                  <Users className="size-3.5" aria-hidden />
                  @{alt.username}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Duplicate to alt ▸ submenu — shown when onDuplicateToAlt + alts are provided */}
        {showDuplicateToAlt && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Copy className="size-4" />
              Duplicate to alt
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {alts!.map((alt) => (
                <DropdownMenuItem
                  key={alt.id}
                  onClick={() => onDuplicateToAlt!(summary.id, alt.id)}
                >
                  <Users className="size-3.5" aria-hidden />
                  @{alt.username}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Export — shown when onExport is provided */}
        {onExport && (
          <DropdownMenuItem onClick={() => onExport(summary.id)}>
            <Upload className="size-4" />
            Export (Showdown)
          </DropdownMenuItem>
        )}

        {/* Make public / Make private — account rows only */}
        {showMakePublic && (
          <DropdownMenuItem
            onClick={() => onMakePublic!(summary.id, !isPublic)}
          >
            {isPublic ? (
              <>
                <Lock className="size-4" />
                Make private
              </>
            ) : (
              <>
                <Globe className="size-4" />
                Make public
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Keep local-only / Allow syncing — local rows only */}
        {showToggleLocalOnly && (
          <DropdownMenuItem
            onClick={() => onToggleLocalOnly!(summary.id, !localOnly)}
          >
            <Lock className="size-4" />
            {localOnly ? "Allow syncing" : "Keep local-only"}
          </DropdownMenuItem>
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
        {hasNonDestructiveItems && <DropdownMenuSeparator />}

        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete?.(summary.id)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// TeamRow — desktop layout
// ---------------------------------------------------------------------------
//
// Layout (fixed columns, NOT flex-1 sprites):
//   grip (Custom-order only)
//   → checkbox (selectable mode)
//   → [Link: name col + sprite strip + spacer + right group]
//   → ⋯ overflow menu
//
// Name column: fixed width w-44 sm:w-48 with name + 📌 badge inline + subtitle
// Sprite strip: flex shrink-0 gap-1 (size-6 sm:size-8)
// Flex spacer: fills remaining space between sprites and right group
// Right group: format Badge · Legal/Illegal StatusBadge · "Local" badge
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TeamRow — mobile layout
// ---------------------------------------------------------------------------
//
// Stack:
//   Row 1 (top): sprite strip
//   Row 2: name + 📌 (left) · format / Local / ⋯ (right)
//
// Always visible overflow trigger (no group-hover on mobile).
// ---------------------------------------------------------------------------

interface MobileRowProps
  extends Pick<
    TeamRowProps,
    | "summary"
    | "highlightSpecies"
    | "pinned"
    | "isAuthenticated"
    | "selectable"
    | "selected"
    | "onToggleSelect"
    | "onDelete"
    | "onPeek"
    | "archived"
    | "onTogglePin"
    | "onToggleArchive"
    | "manualFolders"
    | "memberFolderIds"
    | "onToggleFolder"
    | "reorderable"
    | "canMoveUp"
    | "canMoveDown"
    | "onMove"
    | "alts"
    | "showAltBadge"
    | "altUsername"
    | "isPublic"
    | "localOnly"
    | "onRename"
    | "onDuplicate"
    | "onMoveToAlt"
    | "onDuplicateToAlt"
    | "onExport"
    | "onMakePublic"
    | "onToggleLocalOnly"
  > {}

function MobileTeamRow({
  summary,
  highlightSpecies,
  pinned,
  isAuthenticated,
  selectable,
  selected,
  onToggleSelect,
  onDelete,
  onPeek,
  archived,
  onTogglePin,
  onToggleArchive,
  manualFolders,
  memberFolderIds,
  onToggleFolder,
  reorderable,
  canMoveUp,
  canMoveDown,
  onMove,
  alts,
  showAltBadge,
  altUsername,
  isPublic,
  localOnly,
  onRename,
  onDuplicate,
  onMoveToAlt,
  onDuplicateToAlt,
  onExport,
  onMakePublic,
  onToggleLocalOnly,
}: MobileRowProps) {
  const highlightSet = new Set(highlightSpecies ?? []);

  return (
    <div className="group flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
      {/* Bulk-selection checkbox — sibling of Link, not nested inside it */}
      {selectable && (
        <div
          className="flex size-6 shrink-0 items-center justify-center pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            data-testid={`checkbox-${summary.id}`}
            checked={selected ?? false}
            aria-label={`Select ${summary.name}`}
            onClick={(e: React.MouseEvent) => {
              onToggleSelect?.(summary.id, { shift: e.shiftKey });
            }}
          />
        </div>
      )}

      {/* Main link area — stacked two-row layout */}
      <Link
        href={draftEditorHref(summary.id)}
        className="flex min-w-0 flex-1 flex-col gap-1.5"
      >
        {/* Row 1: Sprite strip */}
        <div className="flex min-w-0 items-center gap-1">
          {summary.filledCount === 0 ? (
            <span className="text-muted-foreground text-xs">Empty</span>
          ) : (
            summary.species.map((slot, i) => (
              <Sprite
                key={`${slot.species ?? "empty"}-${i}`}
                slot={slot}
                index={i}
                highlighted={
                  slot.species !== null && highlightSet.has(slot.species)
                }
                sizeClass="size-8"
              />
            ))
          )}
        </div>

        {/* Row 2: name + pin badge (left) · format / local / alt badge (right) */}
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Name + pin badge */}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="truncate text-sm font-medium leading-tight">
              {summary.name}
            </span>
            {pinned && (
              <span className="shrink-0 text-xs" aria-label="Pinned">
                📌
              </span>
            )}
          </div>
          {/* Right meta: format + sync badge + optional alt mini-badge */}
          <div className="flex shrink-0 items-center gap-1">
            {summary.format && (
              <Badge variant="secondary" className="text-xs">
                {getFormatLabel(summary.format)}
              </Badge>
            )}
            {(() => {
              const badge = syncBadge(summary.source, isAuthenticated);
              return (
                <Badge
                  variant="outline"
                  className={cn(badge.className)}
                  title={badge.title}
                >
                  <badge.Icon className="mr-1 size-3" aria-hidden />
                  {badge.label}
                </Badge>
              );
            })()}
            {/* Alt mini-badge — §5: shown in "All alts" view */}
            {showAltBadge && altUsername && (
              <Badge
                variant="outline"
                className="max-w-20 truncate border-muted-foreground/20 text-xs text-muted-foreground"
                title={`@${altUsername}`}
              >
                @{altUsername}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      {/* Overflow menu — always visible on mobile (no group-hover gating) */}
      <OverflowMenu
        summary={summary}
        onDelete={onDelete}
        onPeek={onPeek}
        pinned={pinned}
        archived={archived}
        onTogglePin={onTogglePin}
        onToggleArchive={onToggleArchive}
        manualFolders={manualFolders}
        memberFolderIds={memberFolderIds}
        onToggleFolder={onToggleFolder}
        reorderable={reorderable}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMove={onMove}
        alts={alts}
        altUsername={altUsername}
        isPublic={isPublic}
        localOnly={localOnly}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onMoveToAlt={onMoveToAlt}
        onDuplicateToAlt={onDuplicateToAlt}
        onExport={onExport}
        onMakePublic={onMakePublic}
        onToggleLocalOnly={onToggleLocalOnly}
        triggerClassName="opacity-100"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamRow (main export)
// ---------------------------------------------------------------------------

/**
 * Name-first row for the /builder landing draft list.
 *
 * Layout:
 *  Desktop — `grip? → checkbox? → [name col | sprite strip | spacer | right group] → ⋯`
 *  Mobile  — sprite strip on top, then name + meta + ⋯ on bottom (fixes 393px overlap)
 *
 * The main area is a Next.js Link to the draft editor. The overflow menu and
 * optional leading Checkbox are siblings (not nested inside the link) to avoid
 * nested interactive elements. The optional Checkbox intercepts its own click
 * (with shift-key detection) without hijacking the Link.
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
  isAuthenticated,
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
  alts,
  showAltBadge,
  altUsername,
  isPublic,
  localOnly,
  onRename,
  onDuplicate,
  onMoveToAlt,
  onDuplicateToAlt,
  onExport,
  onMakePublic,
  onToggleLocalOnly,
}: TeamRowProps) {
  const highlightSet = new Set(highlightSpecies ?? []);

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

  // Mobile detection — SSR renders desktop path; client corrects after hydration.
  // useIsClient() prevents the mobile layout from briefly flashing on first paint.
  const isClient = useIsClient();
  const isMobile = useIsMobile();

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  // Mobile layout — stacked card; no drag handle in this view.
  if (isClient && isMobile) {
    return (
      <div ref={setNodeRef} style={sortableStyle}>
        <MobileTeamRow
          summary={summary}
          highlightSpecies={highlightSpecies}
          pinned={pinned}
          isAuthenticated={isAuthenticated}
          selectable={selectable}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onPeek={onPeek}
          archived={archived}
          onTogglePin={onTogglePin}
          onToggleArchive={onToggleArchive}
          manualFolders={manualFolders}
          memberFolderIds={memberFolderIds}
          onToggleFolder={onToggleFolder}
          reorderable={reorderable}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMove={onMove}
          alts={alts}
          showAltBadge={showAltBadge}
          altUsername={altUsername}
          isPublic={isPublic}
          localOnly={localOnly}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onMoveToAlt={onMoveToAlt}
          onDuplicateToAlt={onDuplicateToAlt}
          onExport={onExport}
          onMakePublic={onMakePublic}
          onToggleLocalOnly={onToggleLocalOnly}
        />
      </div>
    );
  }

  // Desktop layout — fixed-column row card.
  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className="group flex items-center gap-2 rounded-lg bg-muted/30 py-2.5 transition-colors hover:bg-muted/50 sm:gap-3"
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
        <div className="w-44 min-w-0 shrink-0 sm:w-48">
          {/* Name + inline pin badge */}
          <div className="flex items-center gap-1">
            <span className="block truncate text-sm font-medium leading-tight">
              {summary.name}
            </span>
            {pinned && (
              <span className="shrink-0 text-xs" aria-label="Pinned">
                📌
              </span>
            )}
          </div>
          {/* "Edited X ago" subtitle */}
          <span className="text-muted-foreground block truncate text-xs leading-tight">
            edited {formatTimeAgo(summary.updatedAt)}
          </span>
        </div>

        {/* Sprite strip — shrink-0 so sprites never compress or expand */}
        <div className="flex shrink-0 items-center gap-1">
          {summary.filledCount === 0 ? (
            <span className="text-muted-foreground text-xs">Empty</span>
          ) : (
            summary.species.map((slot, i) => (
              <Sprite
                key={`${slot.species ?? "empty"}-${i}`}
                slot={slot}
                index={i}
                highlighted={
                  slot.species !== null && highlightSet.has(slot.species)
                }
              />
            ))
          )}
        </div>

        {/* Right group: format badge · legal status · local badge · alt mini-badge
            sits directly after the sprites (no flex spacer) so the team's
            identity reads as one tight cluster instead of name···void···badges */}
        <div className="flex shrink-0 items-center gap-2">
          {summary.format && (
            <Badge variant="secondary" className="text-xs">
              {getFormatLabel(summary.format)}
            </Badge>
          )}
          <StatusBadge
            status={summary.isLegal ? "active" : "cancelled"}
            label={summary.isLegal ? "Legal" : "Illegal"}
          />
          {(() => {
            const badge = syncBadge(summary.source, isAuthenticated);
            return (
              <Badge
                variant="outline"
                className={cn(badge.className)}
                title={badge.title}
              >
                <badge.Icon className="mr-1 size-3" aria-hidden />
                {badge.label}
              </Badge>
            );
          })()}
          {/* Alt mini-badge — §5: shown in "All alts" view for account rows */}
          {showAltBadge && altUsername && (
            <Badge
              variant="outline"
              className="max-w-24 truncate border-muted-foreground/20 text-xs text-muted-foreground"
              title={`@${altUsername}`}
            >
              @{altUsername}
            </Badge>
          )}
        </div>
      </Link>

      {/* Overflow menu — sibling of Link, not nested inside it */}
      <OverflowMenu
        summary={summary}
        onDelete={onDelete}
        onPeek={onPeek}
        pinned={pinned}
        archived={archived}
        onTogglePin={onTogglePin}
        onToggleArchive={onToggleArchive}
        manualFolders={manualFolders}
        memberFolderIds={memberFolderIds}
        onToggleFolder={onToggleFolder}
        reorderable={reorderable}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMove={onMove}
        alts={alts}
        altUsername={altUsername}
        isPublic={isPublic}
        localOnly={localOnly}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onMoveToAlt={onMoveToAlt}
        onDuplicateToAlt={onDuplicateToAlt}
        onExport={onExport}
        onMakePublic={onMakePublic}
        onToggleLocalOnly={onToggleLocalOnly}
      />
    </div>
  );
}
