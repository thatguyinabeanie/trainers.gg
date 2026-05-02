"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";

import { getActiveFormats, type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";
import { ValidationPopover } from "./validation/validation-popover";

const ACTIVE_FORMATS = getActiveFormats();

interface TopbarProps {
  team: TeamWithPokemon;
  filledCount: number;
  format: GameFormat | undefined;
  username: string;
  onOpenImport: () => void;
  validationErrors: ValidationError[];
  onJumpToPokemon: (pokemonId: number) => void;
  onValidate: () => void;
  onFormatChange?: (formatId: string) => Promise<void>;
  exportMenu?: ReactNode;
}

interface StatBlockProps {
  label: string;
  value: string;
}

function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs font-semibold leading-none">
        {value}
      </span>
    </div>
  );
}

export function Topbar({
  team,
  filledCount,
  format,
  username,
  onOpenImport,
  validationErrors,
  onJumpToPokemon,
  onValidate,
  onFormatChange,
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

  const formatBadge = onFormatChange ? (
    <Popover open={formatOpen} onOpenChange={setFormatOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={formatPending}
            className="ml-2 shrink-0"
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
            <span className="text-muted-foreground">Set format…</span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
    <Badge variant="secondary" className="ml-2 shrink-0">
      <span className="mr-1 inline-block size-1.5 rounded-full bg-primary" />
      {format.label}
    </Badge>
  ) : null;

  return (
    <PageHeader>
      <Link
        href={teamsUrl}
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
      >
        {username}
      </Link>
      <span className="hidden text-muted-foreground sm:inline">/</span>
      <Input
        defaultValue={team.name}
        readOnly
        className="h-7 w-28 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-border focus-visible:ring-0 sm:w-32 md:w-44"
        aria-label="Team name"
      />

      {formatBadge}

      <div className="hidden items-center gap-3 lg:flex">
        <StatBlock label="Slots" value={`${filledCount}/6`} />
        <StatBlock label="Record" value="—·—" />
        <StatBlock label="WR" value="—%" />
      </div>

      <div className="ml-auto flex items-center gap-1">
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
      </div>
    </PageHeader>
  );
}
