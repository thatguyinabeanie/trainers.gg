"use client";

import { Plus, ClipboardPaste, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// =============================================================================
// LandingEmptyState
// =============================================================================

interface LandingEmptyStateProps {
  /** "guest" shows a local-save note; "authed" shows the standard copy. */
  variant: "guest" | "authed";
  /** Called when the user clicks "Start from scratch". */
  onNewTeam: () => void;
  /**
   * Called when the user clicks "Import a paste".
   * When undefined, the button is rendered but disabled (no handler wired yet).
   */
  onImport?: () => void;
}

/**
 * Full-shell empty / first-run state for the /builder landing.
 *
 * Three on-ramps (spec §16, D11):
 * - Start from scratch  → onNewTeam (primary)
 * - Import a paste      → onImport (disabled when undefined)
 * - Start from a sample → stubbed, visibly disabled with a "coming soon" badge
 *
 * Centered in the main content area — NOT a full-page takeover.
 */
export function LandingEmptyState({
  variant,
  onNewTeam,
  onImport,
}: LandingEmptyStateProps) {
  const isGuest = variant === "guest";

  return (
    <div
      className="flex flex-col items-center gap-8 px-4 py-16 text-center"
      data-testid="landing-empty-state"
    >
      {/* Headline + subtext */}
      <div className="flex max-w-md flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isGuest ? "Let's build your first team" : "No teams yet — let's fix that"}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isGuest
            ? "Draft a squad, run the numbers, and organize it all here."
            : "Draft a squad, run the numbers, and organize it all here. Your first team shows up in this space."}
        </p>

        {/* Guest note: local-save context */}
        {isGuest && (
          <p className="text-muted-foreground text-xs">
            Building as a guest — your teams save to this device. Sign in to
            sync everywhere &amp; organize across alts.
          </p>
        )}
      </div>

      {/* On-ramp cards */}
      <div
        className={cn(
          "grid w-full max-w-xl gap-4",
          "grid-cols-1 sm:grid-cols-3"
        )}
      >
        {/* On-ramp 1: Start from scratch — primary */}
        <OnRampCard
          icon={<Plus className="size-6" />}
          label="Start from scratch"
          description="Open a blank team and build from the ground up."
          onClick={onNewTeam}
          data-testid="onramp-scratch"
        />

        {/* On-ramp 2: Import a paste */}
        <OnRampCard
          icon={<ClipboardPaste className="size-6" />}
          label="Import a paste"
          description="Paste a Showdown export and jump straight in."
          onClick={onImport}
          disabled={onImport === undefined}
          data-testid="onramp-import"
        />

        {/* On-ramp 3: Start from a sample — stubbed (source TBD, spec §20) */}
        <OnRampCard
          icon={<Sparkles className="size-6" />}
          label="Start from a sample"
          description="Browse popular team archetypes as a starting point."
          disabled
          comingSoon
          data-testid="onramp-sample"
        />
      </div>
    </div>
  );
}

// =============================================================================
// OnRampCard — internal card for a single on-ramp action
// =============================================================================

interface OnRampCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  /** Click handler. When undefined and not disabled, card is inert. */
  onClick?: () => void;
  /** When true, renders the card in a disabled/muted state with no interaction. */
  disabled?: boolean;
  /**
   * When true, adds a small "Coming soon" badge.
   * Only valid together with disabled.
   */
  comingSoon?: boolean;
  "data-testid"?: string;
}

function OnRampCard({
  icon,
  label,
  description,
  onClick,
  disabled = false,
  comingSoon = false,
  "data-testid": testId,
}: OnRampCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col items-center gap-3 p-5 transition-shadow",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:shadow-md"
      )}
      data-testid={testId}
    >
      {/* Coming-soon badge — top-right corner */}
      {comingSoon && (
        <span
          className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          aria-label="Coming soon"
        >
          Coming soon
        </span>
      )}

      {/* Icon */}
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          disabled ? "bg-muted text-muted-foreground" : "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
        )}
        aria-hidden
      >
        {icon}
      </span>

      {/* Label + description */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </span>
      </div>

      {/* Action button — full min-height for touch targets (≥40px) */}
      <Button
        variant={disabled ? "outline" : "default"}
        size="sm"
        className="mt-auto min-h-10 w-full"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
      >
        {label}
      </Button>
    </Card>
  );
}
