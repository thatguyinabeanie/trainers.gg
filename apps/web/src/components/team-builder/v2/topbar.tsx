"use client";

import { type ReactNode, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

import { getActiveFormats, type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";
import { TeamLayoutToggle } from "./team-layout-toggle";
import { ValidationPopover } from "./validation/validation-popover";

const ACTIVE_FORMATS = getActiveFormats();

// =============================================================================
// Props
// =============================================================================

interface TopbarProps {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  username: string;
  alts: Tables<"alts">[];
  onOpenImport: () => void;
  validationErrors: ValidationError[];
  onJumpToPokemon: (pokemonId: number) => void;
  onValidate: () => void;
  onNameChange: (name: string) => Promise<void>;
  onFormatChange?: (formatId: string) => Promise<void>;
  onAltChange?: (altId: number) => Promise<void>;
  exportMenu?: ReactNode;
}

// =============================================================================
// Inline editable team name
// =============================================================================

interface EditableNameProps {
  defaultValue: string;
  onSave: (name: string) => Promise<void>;
}

function EditableName({ defaultValue, onSave }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevDefault, setPrevDefault] = useState(defaultValue);

  // Sync local value when defaultValue changes externally (render-time reset)
  if (prevDefault !== defaultValue) {
    setPrevDefault(defaultValue);
    if (!editing) {
      setValue(defaultValue);
    }
  }

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === defaultValue) {
      setValue(defaultValue);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setValue(defaultValue);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={saving}
        autoFocus
        className={cn(
          "h-7 w-36 rounded-md border border-border bg-background px-2 text-sm font-semibold shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:w-44 md:w-56",
          saving && "opacity-60"
        )}
        aria-label="Team name"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex h-7 max-w-36 items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-accent sm:max-w-44 md:max-w-56"
      aria-label="Edit team name"
    >
      <span className="truncate">{defaultValue}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="size-3 shrink-0 text-muted-foreground"
      >
        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.26.445l-.836 3.04a.25.25 0 0 0 .305.305l3.04-.836a1 1 0 0 0 .445-.26l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.219-.219Z" />
      </svg>
    </button>
  );
}

// =============================================================================
// Topbar
// =============================================================================

export function Topbar({
  team,
  format,
  username,
  alts,
  onOpenImport,
  validationErrors,
  onJumpToPokemon,
  onValidate,
  onNameChange,
  onFormatChange,
  onAltChange,
  exportMenu,
}: TopbarProps) {
  const teamsUrl = `/dashboard/alts/${username}/teams`;
  const [validateOpen, setValidateOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatPending, setFormatPending] = useState(false);

  const hasErrors = validationErrors.some((e) => e.severity === "error");
  const hasWarnings = validationErrors.some((e) => e.severity === "warning");
  const hasIssues = hasErrors || hasWarnings;

  function handleValidateOpen(open: boolean) {
    if (open) onValidate();
    setValidateOpen(open);
  }

  function handleJumpToPokemon(pokemonId: number) {
    onJumpToPokemon(pokemonId);
    setValidateOpen(false);
  }

  async function handleFormatPick(formatId: string) {
    if (!onFormatChange || formatId === format?.id) {
      setFormatOpen(false);
      return;
    }
    setFormatPending(true);
    try {
      await onFormatChange(formatId);
    } finally {
      setFormatPending(false);
      setFormatOpen(false);
    }
  }

  // All formats to show: active formats + current format if it's no longer active
  const displayFormats =
    format && !ACTIVE_FORMATS.find((f) => f.id === format.id)
      ? [format, ...ACTIVE_FORMATS]
      : ACTIVE_FORMATS;

  const currentAlt = alts.find((a) => a.username === username);
  const hasMultipleAlts = alts.length > 1;

  // ─── Format badge / selector ────────────────────────────────────────────────

  const formatBadge = onFormatChange ? (
    <Popover open={formatOpen} onOpenChange={setFormatOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={formatPending}
            className="shrink-0"
            aria-label="Change format"
          />
        }
      >
        <Badge
          variant="secondary"
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            formatPending && "opacity-60"
          )}
        >
          {format ? (
            <>
              <span className="mr-1 inline-block size-1.5 rounded-full bg-primary" />
              {format.label}
            </>
          ) : (
            <span className="text-muted-foreground">Set format...</span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Format
        </p>
        <div className="flex flex-wrap gap-1.5">
          {displayFormats.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              disabled={formatPending}
              onClick={() => handleFormatPick(fmt.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                fmt.id === format?.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent"
              )}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  ) : format ? (
    <Badge variant="secondary" className="shrink-0">
      <span className="mr-1 inline-block size-1.5 rounded-full bg-primary" />
      {format.label}
    </Badge>
  ) : null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageHeader hideNotifications>
      {/* Left: Owner + Format (labeled, inline) */}
      <div className="hidden items-center gap-4 sm:flex">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Owner
          </span>
          {hasMultipleAlts && onAltChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-sm font-medium transition-colors hover:text-primary"
                    aria-label="Switch alt"
                  />
                }
              >
                {username}
                <ChevronDownIcon className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="min-w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Team owner</DropdownMenuLabel>
                  {alts.map((alt) => (
                    <DropdownMenuItem
                      key={alt.id}
                      onClick={() => {
                        if (alt.id !== currentAlt?.id) {
                          onAltChange(alt.id);
                        }
                      }}
                      className={cn(
                        "gap-2 py-2 text-sm",
                        alt.id === currentAlt?.id && "font-medium"
                      )}
                    >
                      {alt.id === currentAlt?.id && (
                        <CheckIcon className="size-4 text-primary" />
                      )}
                      <span className={cn(alt.id !== currentAlt?.id && "pl-6")}>
                        {alt.username}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={teamsUrl}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {username}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Format
          </span>
          {formatBadge}
        </div>
      </div>

      {/* Center: Team name (absolutely centered, with label) */}
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Team
          </span>
          <EditableName defaultValue={team.name} onSave={onNameChange} />
        </div>
      </div>

      {/* Right: Actions (flush with far right / notifications) */}
      <div className="ml-auto flex items-center gap-1">
        <TeamLayoutToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenImport}
          className="h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm"
        >
          Import
        </Button>
        {exportMenu}

        <Popover open={validateOpen} onOpenChange={handleValidateOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8 sm:px-3 sm:text-sm",
                  hasErrors &&
                    "border-destructive/50 text-destructive hover:border-destructive hover:text-destructive",
                  hasWarnings &&
                    !hasErrors &&
                    "border-amber-400/50 text-amber-600 hover:border-amber-400 dark:text-amber-400"
                )}
              >
                Validate
                {hasIssues && (
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 size-2 rounded-full",
                      hasErrors ? "bg-destructive" : "bg-amber-500"
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            }
          />
          <PopoverContent
            side="bottom"
            align="end"
            className="w-auto max-w-[calc(100vw-2rem)] p-0"
          >
            <ValidationPopover
              errors={validationErrors}
              onJumpToPokemon={handleJumpToPokemon}
            />
          </PopoverContent>
        </Popover>
        <NotificationsPopover />
      </div>
    </PageHeader>
  );
}
