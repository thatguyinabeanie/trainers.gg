"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";



// =============================================================================
// FormChip — shared loadout row chip (Item / Ability / Nature / Tera etc.)
//
// Encapsulates the Popover + s.formRow + label/value structure so every chip
// in the identity lane and the calc defender header renders identically.
// =============================================================================

export interface FormChipProps {
  /** Two-letter-ish prefix label (e.g. "Item", "Abil", "Nat", "Tera"). */
  label: string;
  /** Display string. Empty string renders the muted-italic em-dash placeholder. */
  value: string;
  /** Optional trailing element rendered after the value (e.g. nature ±chevrons). */
  trailing?: ReactNode;
  /**
   * Optional extra className applied to the trigger button.
   * Use to add per-instance styling such as a validation error ring:
   *   `errors.length > 0 && "ring-1 ring-destructive/40 rounded"`
   */
  triggerClassName?: string;
  /**
   * Controlled open state. When provided (along with `onOpenChange`), the
   * popover is controlled — the picker's onClose callback can call
   * `onOpenChange(false)` to dismiss it. When omitted the popover is
   * uncontrolled and the user clicks outside to close it.
   */
  open?: boolean;
  /** Called when the popover open state changes (controlled mode only). */
  onOpenChange?: (open: boolean) => void;
  /** Picker popover body. */
  children: ReactNode;
}

export function FormChip({
  label,
  value,
  trailing,
  triggerClassName,
  open,
  onOpenChange,
  children,
}: FormChipProps) {
  // Build controlled vs. uncontrolled props for Popover
  const popoverProps =
    open !== undefined && onOpenChange !== undefined
      ? { open, onOpenChange }
      : {};

  return (
    <Popover {...popoverProps}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn("grid grid-cols-[60px_minmax(0,1fr)] items-center gap-1.5 px-1 py-[3px] rounded cursor-pointer bg-transparent text-left w-full transition-colors hover:bg-muted", triggerClassName)}
          />
        }
      >
        <span className="text-[9px] font-bold tracking-[0.08em] uppercase text-muted-foreground font-mono whitespace-nowrap overflow-hidden text-ellipsis shrink-0">{label}</span>
        {trailing ? (
          <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <span
              className={cn(
                "text-[11.5px] text-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
                !value && "italic text-muted-foreground/50"
              )}
            >
              {value || "—"}
            </span>
            {trailing}
          </span>
        ) : (
          <span
            className={cn(
              "text-[11.5px] text-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
              !value && "italic text-muted-foreground/50"
            )}
          >
            {value || "—"}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-auto p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
}
