"use client";

/**
 * BuilderTopbar
 *
 * Slim toolbar controls for the /builder route nav bar center slot.
 * Only contains: team name (center) + File▾ · Validate · Save (right).
 *
 * Alt, format, and layout toggle live in the workspace content area instead.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FolderOpen,
  Upload,
  Copy,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

import { exportTeamToShowdown, getFormatById } from "@trainers/pokemon";
import {
  type TeamWithPokemon,
  type CrossAltTeamListItem,
} from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { type ValidationError } from "./validation-hooks";
import { dbPokemonToFlat } from "./pokemon-utils";
import { ValidationPopover } from "./validation/validation-popover";

// =============================================================================
// Props
// =============================================================================

interface BuilderTopbarProps {
  team: TeamWithPokemon;
  /** All teams across user's alts for the load dialog. */
  userTeams?: CrossAltTeamListItem[];
  /** Whether teams are still loading. */
  teamsLoading?: boolean;
  /** Called when user picks a team to load. */
  onLoadTeam?: (teamId: number) => void;
  /** Called when authenticated user clicks "Save to account". */
  onSaveToAccount?: () => void;
  /** Whether the save-to-account operation is in progress. */
  isSaving?: boolean;
  onOpenImport: () => void;
  validationErrors: ValidationError[];
  onJumpToPokemon: (pokemonId: number) => void;
  onValidate: () => void;
  onNameChange: (name: string) => Promise<void>;
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
          "border-border bg-background focus-visible:ring-ring h-7 w-44 rounded-md border px-2 text-sm font-semibold shadow-xs transition-colors outline-none focus-visible:ring-2 sm:w-56",
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
      className="hover:bg-accent flex h-7 max-w-44 items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors sm:max-w-56"
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
// Component
// =============================================================================

export function BuilderTopbar({
  team,
  userTeams = [],
  teamsLoading,
  onLoadTeam,
  onSaveToAccount,
  isSaving,
  onOpenImport,
  validationErrors,
  onJumpToPokemon,
  onValidate,
  onNameChange,
}: BuilderTopbarProps) {
  const [validateOpen, setValidateOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

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

  function handleLoadTeam(teamId: number) {
    onLoadTeam?.(teamId);
    setLoadOpen(false);
  }

  function buildShowdownText(): string {
    const sorted = [...team.team_pokemon]
      .sort((a, b) => a.team_position - b.team_position)
      .flatMap((tp) => (tp.pokemon ? [dbPokemonToFlat(tp.pokemon)] : []));
    return exportTeamToShowdown(sorted);
  }

  async function handleCopyShowdown() {
    try {
      const text = buildShowdownText();
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy — please copy manually.");
    }
  }

  async function handleOpenPokepaste() {
    try {
      const text = buildShowdownText();
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste it on Pokepaste.");
      window.open("https://pokepast.es/create/", "_blank", "noopener");
    } catch {
      toast.error("Failed to copy — please copy manually.");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Center: Team name — absolutely centered in the nav bar */}
      <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
        <div className="pointer-events-auto">
          <EditableName defaultValue={team.name} onSave={onNameChange} />
        </div>
      </div>

      {/* Right: Actions — pushed to the right edge */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* File dropdown (Load / Import / Export) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs shadow-xs transition-colors"
              />
            }
          >
            File
            <ChevronDown className="text-muted-foreground size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
            {onLoadTeam && (
              <>
                <DropdownMenuItem onClick={() => setLoadOpen(true)}>
                  <FolderOpen className="size-4" />
                  Load team...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onOpenImport}>
              <Upload className="size-4" />
              Import paste
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyShowdown}>
              <Copy className="size-4" />
              Copy as Showdown text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenPokepaste}>
              <ExternalLink className="size-4" />
              Open in Pokepaste
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Validate */}
        <Popover open={validateOpen} onOpenChange={handleValidateOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "border-input bg-background hover:bg-accent hover:text-accent-foreground relative inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs shadow-xs transition-colors",
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

        {/* Save / Sign in */}
        {onSaveToAccount ? (
          <Button
            size="sm"
            onClick={onSaveToAccount}
            disabled={isSaving}
            className="h-7 px-3 text-xs"
          >
            {isSaving ? "Saving..." : "Save to account"}
          </Button>
        ) : (
          <Link
            href={`/sign-in?redirect=${encodeURIComponent("/builder?action=save")}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 items-center rounded-md px-3 text-xs font-medium shadow-xs transition-colors"
          >
            Sign in to save
          </Link>
        )}
      </div>

      {/* Load team popover (opened from File menu) */}
      {onLoadTeam && (
        <Popover open={loadOpen} onOpenChange={setLoadOpen}>
          {/* Hidden trigger — popover opened programmatically */}
          <PopoverTrigger render={<button className="sr-only" />} />
          <PopoverContent side="bottom" align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Load team
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {teamsLoading ? (
                <div className="text-muted-foreground px-3 py-6 text-center text-xs">
                  Loading teams...
                </div>
              ) : userTeams.length === 0 ? (
                <div className="text-muted-foreground px-3 py-6 text-center text-xs">
                  No saved teams yet.
                </div>
              ) : (
                <div className="py-1">
                  {userTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleLoadTeam(t.id)}
                      className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {t.alt_username}
                          {t.format ? ` · ${getFormatById(t.format)?.label ?? t.format}` : ""}
                          {" · "}
                          {t.team_pokemon.filter((tp) => tp.pokemon).length}/6
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
