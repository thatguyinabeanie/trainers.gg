"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";
import { ValidationPopover } from "./validation/validation-popover";

// =============================================================================
// Types
// =============================================================================

interface TopbarProps {
  team: TeamWithPokemon;
  filledCount: number;
  format: GameFormat | undefined;
  username: string;
  onOpenImport: () => void;
  onSave: () => void;
  /** Flat list of all validation errors/warnings for the team. */
  validationErrors: ValidationError[];
  /** Called when the user clicks an error row in the validation popover. */
  onJumpToPokemon: (pokemonId: number) => void;
  /** Runs immediate (non-debounced) validation. */
  onValidate: () => void;
  /** Pre-rendered ExportMenu dropdown — passed from parent so Topbar stays stateless about export logic. */
  exportMenu?: ReactNode;
}

// =============================================================================
// StatBlock — eyebrow label + value pair
// =============================================================================

interface StatBlockProps {
  label: string;
  value: string;
}

function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold leading-none">
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Topbar
// =============================================================================

/**
 * Sticky top bar for the v2 team builder workspace.
 * LEFT: brand wordmark, breadcrumb (alt / team name input).
 * CENTER: format pill, slot/record/WR stat blocks.
 * RIGHT: action buttons (⌘K, Import, Validate, Calc toggle, Save).
 *
 * The Validate button opens a popover showing all team validation issues.
 * A small red dot on the button indicates when errors or warnings exist.
 */
export function Topbar({
  team,
  filledCount,
  format,
  username,
  onOpenImport,
  onSave,
  validationErrors,
  onJumpToPokemon,
  onValidate,
  exportMenu,
}: TopbarProps) {
  const teamsUrl = `/dashboard/alts/${username}/teams`;
  const [validateOpen, setValidateOpen] = useState(false);

  const hasErrors = validationErrors.some((e) => e.severity === "error");
  const hasWarnings = validationErrors.some((e) => e.severity === "warning");
  const hasIssues = hasErrors || hasWarnings;

  function handleValidateOpen(open: boolean) {
    if (open) {
      onValidate();
    }
    setValidateOpen(open);
  }

  function handleJumpToPokemon(pokemonId: number) {
    onJumpToPokemon(pokemonId);
    setValidateOpen(false);
  }

  return (
    <header className="bg-background/95 sticky top-0 z-30 shrink-0 border-b backdrop-blur">
      {/*
       * MOBILE: two rows stacked
       *   Row 1 — identity: brand · breadcrumb · team name · format pill
       *   Row 2 — actions: Import · Validate · Calc · Save
       * DESKTOP (md+): single row identical to pre-mobile behaviour
       */}

      {/* ── Row 1 — identity ───────────────────────────────────────── */}
      <div className="flex h-12 items-center gap-2 px-3 md:gap-3 md:px-4">
        {/* LEFT — brand + breadcrumb */}
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 text-sm">
          <Link
            href="/dashboard"
            className="font-extrabold tracking-wide text-primary"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            trainers.gg
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={teamsUrl}
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            {username}
          </Link>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          {/* Team name — read-only display */}
          <Input
            defaultValue={team.name}
            readOnly
            className="h-6 w-28 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-border focus-visible:ring-0 sm:w-32 md:w-44"
            aria-label="Team name"
          />
        </div>

        {/* CENTER — format pill + stat blocks */}
        <div className="flex flex-1 items-center justify-center gap-4">
          {format && (
            <Badge variant="secondary" className="shrink-0">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-primary" />
              {format.label}
            </Badge>
          )}
          {/* Stat blocks — hidden on phones (< sm), shown sm+ */}
          <div className="hidden items-center gap-4 sm:flex">
            <StatBlock label="Slots" value={`${filledCount}/6`} />
            <StatBlock label="Record" value="—·—" />
            <StatBlock label="WR" value="—%" />
          </div>
        </div>

        {/* RIGHT on desktop (md+) — action buttons inline */}
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <Button variant="ghost" size="sm">
            ⌘K
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenImport}>
            Import
          </Button>
          {exportMenu}

          {/* Validate button */}
          <Popover open={validateOpen} onOpenChange={handleValidateOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "relative inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    hasErrors && "border-destructive/50 text-destructive hover:border-destructive hover:text-destructive",
                    hasWarnings && !hasErrors && "border-amber-400/50 text-amber-600 hover:border-amber-400 dark:text-amber-400"
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

          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>

      {/* ── Row 2 — action row (phones only, hidden md+) ─────────────── */}
      <div className="flex h-10 items-center gap-1 border-t px-3 md:hidden">
        <Button variant="outline" size="sm" onClick={onOpenImport} className="h-7 text-xs">
          Import
        </Button>
        {exportMenu}

        {/* Validate button */}
        <Popover open={validateOpen} onOpenChange={handleValidateOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                  hasErrors && "border-destructive/50 text-destructive hover:border-destructive hover:text-destructive",
                  hasWarnings && !hasErrors && "border-amber-400/50 text-amber-600 hover:border-amber-400 dark:text-amber-400"
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
            align="start"
            className="w-auto max-w-[calc(100vw-2rem)] p-0"
          >
            <ValidationPopover
              errors={validationErrors}
              onJumpToPokemon={handleJumpToPokemon}
            />
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <span className="flex-1" />

        <Button size="sm" onClick={onSave} className="h-7 text-xs">
          Save
        </Button>
      </div>
    </header>
  );
}
