"use client";

/**
 * ReconcileBanner
 *
 * Amber info strip shown to newly-authenticated users who have local drafts
 * waiting to be saved. Prompts them to pick an alt and save all local teams
 * to their account in one action.
 *
 * Render null when there are no local drafts or no alts to receive them.
 */

import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// Props
// =============================================================================

interface ReconcileBannerProps {
  localDraftCount: number;
  alts: { id: number; username: string }[];
  onSaveAllToAlt: (altId: number) => void;
  onDismiss: () => void;
  saving?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ReconcileBanner({
  localDraftCount,
  alts,
  onSaveAllToAlt,
  onDismiss,
  saving = false,
}: ReconcileBannerProps) {
  // useState must be called unconditionally before any early return (Rules of Hooks).
  // defaultAlt.id is stable for the lifetime of the component — alts never change mid-render.
  const firstAltId = alts[0]?.id ?? 0;
  const [selectedAltId, setSelectedAltId] = useState<number>(firstAltId);

  // Render nothing when there's nothing to reconcile
  if (localDraftCount === 0 || alts.length === 0) return null;

  const teamLabel = localDraftCount === 1 ? "team" : "teams";
  const pluralisedCopy = `You have ${localDraftCount} local ${teamLabel} on this device. Save ${localDraftCount === 1 ? "it" : "them"} to your alt?`;

  function handleSave() {
    onSaveAllToAlt(selectedAltId);
  }

  // Base UI Select can emit null (e.g. on clear); ignore null and coerce otherwise.
  function handleAltChange(value: string | null) {
    if (value !== null) setSelectedAltId(Number(value));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-amber-500/30 bg-amber-500/5 px-4 py-2"
      )}
    >
      {/* Message */}
      <p className="text-sm text-amber-600 dark:text-amber-400 min-w-0 flex-1">
        {pluralisedCopy}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Alt picker — only shown when the user has more than one alt */}
        {alts.length > 1 && (
          <Select
            value={String(selectedAltId)}
            onValueChange={handleAltChange}
          >
            <SelectTrigger
              size="sm"
              className="h-10 w-full sm:h-8 sm:w-auto"
              aria-label="Select alt to save teams to"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {alts.map((alt) => (
                <SelectItem key={alt.id} value={String(alt.id)}>
                  {alt.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Save all button — h-10 (40px) on mobile, h-8 on desktop */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "h-10 rounded-md px-3 text-xs font-medium transition-colors sm:h-8",
            "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2"
          )}
        >
          {saving ? "Saving…" : "Save all"}
        </button>

        {/* Dismiss button — size-10 (40px) on mobile, size-7 on desktop */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "flex size-10 items-center justify-center text-xs sm:size-7",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
