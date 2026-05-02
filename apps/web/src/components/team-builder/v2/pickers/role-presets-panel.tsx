/**
 * RolePresetsPanel — middle-column sidebar listing all 26 role presets
 * grouped by category. Multi-select toggle: clicking a role adds/removes it
 * from the active selection. Bucket counts (species or moves matching that
 * role) are displayed right-aligned next to each label.
 *
 * Used by both the species picker and the move picker.
 */
"use client";

import { cn } from "@/lib/utils";

import {
  GROUP_COLORS,
  ROLE_GROUP_LABELS,
  ROLE_GROUP_ORDER,
  ROLE_PRESETS,
} from "./role-registry";

// =============================================================================
// Types
// =============================================================================

interface RolePresetsPanelProps {
  /** Active role ids (multi-select). */
  selected: string[];
  /** Called with the next selected array when a role is toggled. */
  onChange: (next: string[]) => void;
  /** Returns the bucket count for each role, shown right-aligned. */
  bucketCount: (roleId: string) => number;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/** Sidebar panel listing all role presets with group headers and bucket counts. */
export function RolePresetsPanel({
  selected,
  onChange,
  bucketCount,
  className,
}: RolePresetsPanelProps) {
  function toggle(roleId: string) {
    if (selected.includes(roleId)) {
      onChange(selected.filter((r) => r !== roleId));
    } else {
      onChange([...selected, roleId]);
    }
  }

  return (
    <div
      className={cn(
        "flex w-[170px] flex-shrink-0 flex-col overflow-y-auto bg-muted/20 px-0 py-2.5",
        className
      )}
    >
      <span className="block px-3 pb-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">
        Role
      </span>

      {ROLE_GROUP_ORDER.map((group) => {
        const presets = ROLE_PRESETS.filter((r) => r.group === group);
        return (
          <div key={group} className="mb-1">
            <span className="block px-3 pb-0.5 pt-1.5 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {ROLE_GROUP_LABELS[group]}
            </span>
            {presets.map((preset) => {
              const isActive = selected.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggle(preset.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] transition-colors",
                    isActive
                      ? cn(
                          GROUP_COLORS[group].active,
                          GROUP_COLORS[group].text,
                          "font-semibold"
                        )
                      : "text-foreground/70 hover:bg-muted"
                  )}
                >
                  {preset.label}
                  <span
                    className={cn(
                      "ml-auto font-mono text-[8.5px] tabular-nums",
                      isActive ? "" : "text-muted-foreground/60"
                    )}
                  >
                    {bucketCount(preset.id)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
