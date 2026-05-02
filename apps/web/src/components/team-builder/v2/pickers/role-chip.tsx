/**
 * RoleChip — a colored pill that renders one role label with its group's color
 * tint. Used in move-row Roles columns and as the active visual for sidebar
 * role buttons in both the move picker and species picker.
 */

"use client";

import { cn } from "@/lib/utils";

import { GROUP_COLORS, getRoleById } from "./role-registry";

interface RoleChipProps {
  roleId: string;
  onClick?: (roleId: string) => void;
  className?: string;
}

export function RoleChip({ roleId, onClick, className }: RoleChipProps) {
  const role = getRoleById(roleId);
  if (!role) return null;
  const colors = GROUP_COLORS[role.group];
  const baseClass = cn(
    "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold transition-all",
    colors.chip,
    className
  );

  // When `onClick` is absent the chip is purely decorative — render a
  // non-interactive <span> so it doesn't appear in the tab order or imply
  // an action that does nothing.
  if (!onClick) {
    return <span className={baseClass}>{role.label}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(roleId);
      }}
      className={cn(baseClass, "cursor-pointer hover:-translate-y-px")}
    >
      {role.label}
    </button>
  );
}
