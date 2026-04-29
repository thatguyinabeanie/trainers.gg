"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { updateAltVisibilityAction } from "@/actions/profile";

interface AltVisibilityToggleProps {
  altId: number;
  isPublic: boolean;
  onRefresh: () => void;
  /**
   * How the toggle is laid out in the parent row. `"cell"` is the desktop
   * table — a centered dot in a table cell. `"button"` is the mobile card
   * header — a tappable button aligned with surrounding icons.
   */
  layout?: "cell" | "button";
}

/**
 * Visibility toggle (public/private) dot used in both the desktop alts
 * table and the mobile alts cards. Stops click AND keyboard event
 * propagation on the button so the row/card header expand toggle
 * doesn't fire when the user changes visibility. The button is
 * disabled while a visibility update is in flight to prevent
 * rapid-click double submissions against a stale `isPublic` prop.
 */
export function AltVisibilityToggle({
  altId,
  isPublic,
  onRefresh,
  layout = "button",
}: AltVisibilityToggleProps) {
  const [isPending, startVisibilityTransition] = useTransition();

  const handleToggle = () => {
    startVisibilityTransition(async () => {
      const result = await updateAltVisibilityAction(altId, !isPublic);
      if (result.success) {
        onRefresh();
      } else {
        toast.error(result.error ?? "Failed to update visibility");
      }
    });
  };

  const stopKeyboardPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isPending) return;
        handleToggle();
      }}
      onKeyDown={stopKeyboardPropagation}
      onKeyUp={stopKeyboardPropagation}
      disabled={isPending}
      className={cn(
        layout === "button"
          ? "flex size-10 shrink-0 items-center justify-center sm:size-7"
          : "mx-auto flex size-10 items-center justify-center sm:size-auto sm:p-1",
        isPending && "cursor-wait opacity-60"
      )}
      aria-label={isPublic ? "Make private" : "Make public"}
      aria-busy={isPending || undefined}
      title={
        isPublic
          ? "Public — click to make private"
          : "Private — click to make public"
      }
    >
      <span
        className={cn(
          "block size-2.5 rounded-full",
          isPublic ? "bg-emerald-500" : "bg-neutral-300"
        )}
      />
    </button>
  );
}
