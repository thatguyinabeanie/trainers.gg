"use client";

/**
 * BuilderSettingsDialog
 *
 * Small centered dialog for editing the persistent builder preferences
 * (account + localStorage via `useBuilderPreferences`). Phase 1 ships the
 * Speed Tiers group; the Damage Calc group is rendered as a disabled
 * "Coming soon" placeholder for a later phase.
 *
 * Changing the Speed Tiers "Default view" controls what the dockbar pill
 * opens. "Open on load" only applies to the sidepane — it is disabled when
 * the default view is "dialog" (dialogs open from the pill, not on load).
 */

import { Info } from "lucide-react";

import { type BuilderPreferences, type PanelView } from "@trainers/validators";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// =============================================================================
// Props
// =============================================================================

interface BuilderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: BuilderPreferences;
  onChange: (next: BuilderPreferences) => void;
}

// =============================================================================
// Segmented control (local helper)
// =============================================================================

interface SegmentedOption<T extends string> {
  /** The value this segment selects. */
  value: T;
  /** Visible label shown inside the button. */
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
  /**
   * Optional prefix used to build a distinct accessible name per button
   * (e.g. "Damage calc default view"). When omitted, each button's
   * accessible name is just its `label`.
   */
  ariaPrefix?: string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onSelect,
  disabled,
  ariaPrefix,
}: SegmentedControlProps<T>) {
  return (
    <div className="bg-muted/50 inline-flex items-center gap-0.5 rounded-md p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            // When an ariaPrefix is supplied the accessible name differs from
            // the plain label so duplicate-label buttons (e.g. the disabled
            // Damage Calc placeholders) don't collide in queries/a11y.
            aria-label={ariaPrefix ? `${ariaPrefix} ${opt.label}` : undefined}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Info tooltip (local helper)
// =============================================================================

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center rounded-full transition-colors"
        aria-label="More information"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

const VIEW_OPTIONS: SegmentedOption<PanelView>[] = [
  { value: "sidepane", label: "Sidepane" },
  { value: "dialog", label: "Dialog" },
];

const TOGGLE_OPTIONS: SegmentedOption<"off" | "on">[] = [
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
];

// =============================================================================
// Component
// =============================================================================

export function BuilderSettingsDialog({
  open,
  onOpenChange,
  preferences,
  onChange,
}: BuilderSettingsDialogProps) {
  const speed = preferences.speedTiers;
  const openOnLoadDisabled = speed.defaultView === "dialog";

  function handleSpeedView(view: PanelView) {
    onChange({
      ...preferences,
      speedTiers: { ...preferences.speedTiers, defaultView: view },
    });
  }

  function handleOpenOnLoad(choice: "off" | "on") {
    onChange({
      ...preferences,
      speedTiers: { ...preferences.speedTiers, openOnLoad: choice === "on" },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogTitle>Builder Settings</DialogTitle>

        <div className="flex flex-col gap-5">
          {/* ─── Speed Tiers ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Speed Tiers
            </h3>

            {/* Default view */}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm">
                Default view
                <InfoTooltip text="Choose whether the Speed Tiers pill opens a side pane or a dialog by default." />
              </span>
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={speed.defaultView}
                onSelect={handleSpeedView}
              />
            </div>

            {/* Open on load — only meaningful for the sidepane */}
            <div
              role="group"
              aria-label="Open on load"
              aria-disabled={openOnLoadDisabled}
              className="flex flex-col gap-1"
            >
              <div
                className={cn(
                  "flex items-center justify-between gap-3",
                  openOnLoadDisabled && "opacity-50"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm">
                  Open on load
                  <InfoTooltip text="When the side pane is the default, open it automatically when the builder loads." />
                </span>
                <SegmentedControl
                  options={TOGGLE_OPTIONS}
                  value={speed.openOnLoad ? "on" : "off"}
                  onSelect={handleOpenOnLoad}
                  disabled={openOnLoadDisabled}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Only applies to the sidepane — dialogs open from the pill.
              </p>
            </div>
          </section>

          {/* ─── Damage Calc (later phase — inert placeholder) ─────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              Damage Calc
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium tracking-normal normal-case">
                Coming soon
              </span>
            </h3>

            <div
              aria-disabled="true"
              className="pointer-events-none flex flex-col gap-3 opacity-50"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Default view</span>
                <SegmentedControl
                  options={VIEW_OPTIONS}
                  value="sidepane"
                  onSelect={() => {}}
                  disabled
                  ariaPrefix="Damage calc default view"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Open on load</span>
                <SegmentedControl
                  options={TOGGLE_OPTIONS}
                  value="off"
                  onSelect={() => {}}
                  disabled
                  ariaPrefix="Damage calc open on load"
                />
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
