"use client";

import { DashboardErrorFallback } from "@/components/dashboard/dashboard-error-fallback";

export default function TeamsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardErrorFallback
      error={error}
      reset={reset}
      message="We couldn't load your teams. This is usually temporary — try refreshing."
    />
  );
}
