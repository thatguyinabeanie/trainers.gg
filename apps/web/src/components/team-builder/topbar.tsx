"use client";

import { type ReactNode, useRef, useState } from "react";
import Link from "next/link";

import { type TeamWithPokemon } from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { cn } from "@/lib/utils";

import { type ValidationError } from "./validation-hooks";
import { TeamLayoutToggle } from "./team-layout-toggle";
import { ValidationPopover } from "./validation/validation-popover";

// =============================================================================
// Shared Icons
// =============================================================================

const SaveIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </svg>
);

// =============================================================================
// Props
// =============================================================================

interface TopbarProps {
  team: TeamWithPokemon;
  /** Builder mode — controls which UI elements are visible. */
  mode?: "local" | "api";
  /** Called when authenticated user clicks "Save to account" in local mode. */
  onSaveToAccount?: () => void;
  /** Whether the save-to-account operation is in progress. */
  isSaving?: boolean;
  /** Path to redirect to after sign-in when no `onSaveToAccount` is supplied. */
  signInRedirectPath?: string;
  onOpenImport: () => void;
  validationErrors: ValidationError[];
  onJumpToPokemon: (pokemonId: number) => void;
  onValidate: () => void;
  onNameChange: (name: string) => Promise<void>;
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
      void commit();
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
        onBlur={() => void commit()}
        onKeyDown={handleKeyDown}
        disabled={saving}
        autoFocus
        className={cn(
          "border-border bg-background focus-visible:ring-ring h-7 w-36 rounded-md border px-2 text-sm font-semibold shadow-xs transition-colors outline-none focus-visible:ring-2 sm:w-44 md:w-56",
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
      className="hover:bg-accent flex h-7 max-w-36 items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors sm:max-w-44 md:max-w-56"
      aria-label="Edit team name"
    >
      <span className="truncate">{defaultValue}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className="text-muted-foreground size-3 shrink-0"
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
  mode = "api",
  onSaveToAccount,
  isSaving,
  signInRedirectPath,
  onOpenImport,
  validationErrors,
  onJumpToPokemon,
  onValidate,
  onNameChange,
  exportMenu,
}: TopbarProps) {
  const [validateOpen, setValidateOpen] = useState(false);

  const isLocalMode = mode === "local";

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Center: Team name (absolutely centered) */}
      <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <EditableName defaultValue={team.name} onSave={onNameChange} />
          {isLocalMode && (
            onSaveToAccount ? (
              <button
                type="button"
                onClick={onSaveToAccount}
                disabled={isSaving}
                aria-label={isSaving ? "Saving…" : "Save to account"}
                className="text-muted-foreground hover:text-primary disabled:text-muted-foreground/40 flex size-7 items-center justify-center rounded-md transition-colors"
              >
                {SaveIcon}
              </button>
            ) : (
              <Link
                href={`/sign-in?redirect=${encodeURIComponent(signInRedirectPath ?? "/builder?action=save")}`}
                aria-label="Sign in to save"
                className="text-muted-foreground hover:text-primary flex size-7 items-center justify-center rounded-md transition-colors"
              >
                {SaveIcon}
              </Link>
            )
          )}
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
                  "border-input bg-background hover:bg-accent hover:text-accent-foreground relative inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs shadow-xs transition-colors sm:h-8 sm:px-3 sm:text-sm",
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
                      "absolute -top-0.5 -right-0.5 size-2 rounded-full",
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
        {isLocalMode ? null : <NotificationsPopover />}
      </div>
    </>
  );
}
