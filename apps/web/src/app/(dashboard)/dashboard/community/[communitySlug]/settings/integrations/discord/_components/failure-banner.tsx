"use client";

// =============================================================================
// Types
// =============================================================================

interface FailureBannerProps {
  /** Number of delivery failures in the last 24 hours. Must be > 0. */
  count: number;
  /** Called when the user clicks the "View" link. */
  onView: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function FailureBanner({ count, onView }: FailureBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <span>
        ⚠{" "}
        <strong>
          {count} delivery {count === 1 ? "failure" : "failures"}
        </strong>{" "}
        in the last 24h
      </span>
      <button
        type="button"
        onClick={onView}
        className="ml-4 shrink-0 font-medium underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
      >
        View ›
      </button>
    </div>
  );
}
