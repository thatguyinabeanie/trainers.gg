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

  return (
    <button
      type="button"
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick(roleId);
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold transition-all",
        onClick && "cursor-pointer hover:-translate-y-px",
        colors.chip,
        className
      )}
    >
      {role.label}
    </button>
  );
}
