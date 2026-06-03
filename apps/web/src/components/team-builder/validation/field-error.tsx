"use client";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";

// =============================================================================
// FieldError — inline field-level error chip for active row lanes
// =============================================================================

interface FieldErrorProps {
  message: string;
  severity?: "error" | "warning";
  className?: string;
}

/**
 * Small inline error chip rendered beneath an offending field in an active row lane.
 * Red for errors, amber for warnings — unobtrusive text, no icon.
 */
export function FieldError({ message, severity = "error", className }: FieldErrorProps) {
  return (
    <span
      className={cn(
        "mt-0.5 block truncate font-mono text-xs leading-none",
        severity === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {message}
    </span>
  );
}

interface FieldErrorsProps {
  errors: readonly ValidationError[];
  className?: string;
}

/** Render every validation error as a stacked inline chip. */
export function FieldErrors({ errors, className }: FieldErrorsProps) {
  return (
    <>
      {errors.map((err, i) => (
        <FieldError key={i} message={err.message} severity={err.severity} className={className} />
      ))}
    </>
  );
}
