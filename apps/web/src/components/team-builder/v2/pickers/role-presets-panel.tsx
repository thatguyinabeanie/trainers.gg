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
  type RoleId,
} from "./role-registry";

// =============================================================================
// Types
// =============================================================================

interface RolePresetsPanelProps {
  /** Active role ids (multi-select). */
  selected: readonly RoleId[];
  /** Called with the next selected array when a role is toggled. */
  onChange: (next: readonly RoleId[]) => void;
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
  function toggle(roleId: RoleId) {
    if (selected.includes(roleId)) {
      onChange(selected.filter((r) => r !== roleId));
    } else {
      onChange([...selected, roleId]);
    }
  }

  return (
    <div
      className={cn(
        "bg-muted/20 flex flex-col overflow-hidden px-0 py-2.5",
        className
      )}
    >
      <span className="text-muted-foreground block px-3 pb-1.5 text-[8.5px] font-bold tracking-widest uppercase">
        Role
      </span>

      {/* Two-column flow so all 26 roles fit without vertical scroll. Each
          group is kept whole via break-inside-avoid. */}
      <div className="columns-2 gap-x-2 px-1">
        {ROLE_GROUP_ORDER.map((group) => {
          const presets = ROLE_PRESETS.filter((r) => r.group === group);
          return (
            <div key={group} className="mb-1.5 break-inside-avoid">
              <span className="text-muted-foreground/50 block px-2 pt-1 pb-0.5 text-[7.5px] font-bold tracking-widest uppercase">
                {ROLE_GROUP_LABELS[group]}
              </span>
              {presets.map((preset) => {
                const isActive = selected.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggle(preset.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition-colors",
                      isActive
                        ? cn(
                            GROUP_COLORS[group].active,
                            GROUP_COLORS[group].text,
                            "font-semibold"
                          )
                        : "text-foreground/70 hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{preset.label}</span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 font-mono text-[8.5px] tabular-nums",
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
    </div>
  );
}
