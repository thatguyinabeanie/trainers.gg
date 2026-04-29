"use client";

import Link from "next/link";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// =============================================================================
// Types
// =============================================================================

interface TopbarProps {
  team: TeamWithPokemon;
  filledCount: number;
  format: GameFormat | undefined;
  username: string;
  calcOpen: boolean;
  onToggleCalc: () => void;
  onOpenImport: () => void;
  onSave: () => void;
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
 */
export function Topbar({
  team,
  filledCount,
  format,
  username,
  calcOpen,
  onToggleCalc,
  onOpenImport,
  onSave,
}: TopbarProps) {
  const teamsUrl = `/dashboard/alts/${username}/teams`;

  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b px-3 backdrop-blur md:px-4">
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
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {username}
        </Link>
        <span className="text-muted-foreground">/</span>
        {/* Team name — read-only display in Phase 1 */}
        <Input
          defaultValue={team.name}
          readOnly
          className="h-6 w-32 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-border focus-visible:ring-0 md:w-44"
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
        <div className="hidden items-center gap-4 sm:flex">
          <StatBlock label="Slots" value={`${filledCount}/6`} />
          <StatBlock label="Record" value="—·—" />
          <StatBlock label="WR" value="—%" />
        </div>
      </div>

      {/* RIGHT — action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="hidden md:inline-flex">
          ⌘K
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenImport}>
          Import paste
        </Button>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">
          Validate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleCalc}
          data-on={calcOpen}
          className="hidden md:inline-flex"
        >
          ⚔ Calc
        </Button>
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </header>
  );
}
