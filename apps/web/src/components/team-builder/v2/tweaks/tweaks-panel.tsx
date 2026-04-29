"use client";

import { useState } from "react";
import { Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import { type Tweaks } from "../use-builder-state";

// =============================================================================
// Types
// =============================================================================

export interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

// =============================================================================
// TweaksSection — heading + content rows
// =============================================================================

interface TweaksSectionProps {
  label: string;
  children: React.ReactNode;
}

function TweaksSection({ label, children }: TweaksSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-muted-foreground/70">
        {label}
      </span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

// =============================================================================
// TweaksRow — label on the left, control on the right
// =============================================================================

interface TweaksRowProps {
  label: string;
  children: React.ReactNode;
}

function TweaksRow({ label, children }: TweaksRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}

// =============================================================================
// TweaksPanel
// =============================================================================

/**
 * Floating overlay for workspace tweaks: density, expand mode, damage calc,
 * and global theme. Fixed bottom-right, collapses to a pill when closed.
 * Theme is driven through next-themes (global) rather than a local data-attr.
 */
/** Body content shared by both desktop panel and mobile Sheet. */
function TweaksPanelBody({
  tweaks,
  setTweak,
}: TweaksPanelProps) {
  const { theme, setTheme } = useTheme();
  const activeTheme: string[] = theme === "light" || theme === "dark" ? [theme] : [];

  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      {/* Layout section */}
      <TweaksSection label="Layout">
        <TweaksRow label="Row mode">
          <ToggleGroup
            multiple={false}
            value={[tweaks.expandMode]}
            onValueChange={(val) => {
              const next = val[0] as Tweaks["expandMode"] | undefined;
              if (next) setTweak("expandMode", next);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="active">Active only</ToggleGroupItem>
            <ToggleGroupItem value="all">All open</ToggleGroupItem>
          </ToggleGroup>
        </TweaksRow>

        <TweaksRow label="Density">
          <ToggleGroup
            multiple={false}
            value={[tweaks.density]}
            onValueChange={(val) => {
              const next = val[0] as Tweaks["density"] | undefined;
              if (next) setTweak("density", next);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="comfy">Comfy</ToggleGroupItem>
            <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
          </ToggleGroup>
        </TweaksRow>

        <TweaksRow label="Damage calc">
          <Switch
            checked={tweaks.showCalc}
            onCheckedChange={(checked) => setTweak("showCalc", checked)}
            size="sm"
            aria-label="Toggle damage calculator"
          />
        </TweaksRow>
      </TweaksSection>

      {/* Theme section */}
      <TweaksSection label="Theme">
        <TweaksRow label="Mode">
          <ToggleGroup
            multiple={false}
            value={activeTheme}
            onValueChange={(val) => {
              const next = val[0] as "dark" | "light" | undefined;
              if (next) setTheme(next);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
          </ToggleGroup>
        </TweaksRow>
      </TweaksSection>

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground/60">
        Settings persist on this device.
      </p>
    </div>
  );
}

export function TweaksPanel({ tweaks, setTweak }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // On mobile: the pill trigger stays bottom-left, panel opens as a Sheet from bottom.
  // On desktop: keep the existing bottom-right floating panel.

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[80vh] max-w-full overflow-y-auto p-0"
            showCloseButton={false}
          >
            <SheetHeader className="flex flex-row items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Settings2 className="size-3.5 text-muted-foreground" />
                <SheetTitle className="text-xs font-semibold">Tweaks</SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close tweaks panel"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </SheetHeader>
            <TweaksPanelBody tweaks={tweaks} setTweak={setTweak} />
          </SheetContent>
        </Sheet>

        {/* Pill trigger — bottom-left on mobile */}
        <div className="fixed bottom-2 left-2 z-40">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-md",
              "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              open && "bg-muted text-foreground"
            )}
            aria-label={open ? "Close tweaks panel" : "Open tweaks panel"}
            aria-expanded={open}
          >
            <Settings2 className="size-3" />
            Tweaks
            <ChevronUp className="size-3" />
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-2 right-2 z-40 sm:bottom-4 sm:right-4",
        "flex flex-col items-end gap-0"
      )}
    >
      {/* Expanded panel */}
      {open && (
        <div
          className={cn(
            "mb-2 w-[260px] rounded-xl border bg-card shadow-md",
            "flex flex-col overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Settings2 className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Tweaks</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close tweaks panel"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <TweaksPanelBody tweaks={tweaks} setTweak={setTweak} />
        </div>
      )}

      {/* Collapsed pill trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-md",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground"
        )}
        aria-label={open ? "Close tweaks panel" : "Open tweaks panel"}
        aria-expanded={open}
      >
        <Settings2 className="size-3" />
        Tweaks
        {open ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronUp className="size-3" />
        )}
      </button>
    </div>
  );
}
