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
 * table and the mobile alts cards. Stops click + keyboard event
 * propagation so the row/card header expand toggle doesn't fire when
 * the user changes visibility.
 */
export function AltVisibilityToggle({
  altId,
  isPublic,
  onRefresh,
  layout = "button",
}: AltVisibilityToggleProps) {
  const [, startVisibilityTransition] = useTransition();

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

  const dot = (
    <span
      className={cn(
        "block size-2.5 rounded-full",
        isPublic ? "bg-emerald-500" : "bg-neutral-300"
      )}
    />
  );

  const button = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      className={cn(layout === "button" ? "shrink-0 p-1" : "mx-auto block")}
      aria-label={isPublic ? "Make private" : "Make public"}
      title={
        isPublic
          ? "Public — click to make private"
          : "Private — click to make public"
      }
    >
      {dot}
    </button>
  );

  // In the table layout the button lives inside a <td> that handles
  // propagation; keep the button styled for a centered cell.
  return button;
}
