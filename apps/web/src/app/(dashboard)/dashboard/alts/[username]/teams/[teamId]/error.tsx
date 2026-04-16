"use client";

import { DashboardErrorFallback } from "@/components/dashboard/dashboard-error-fallback";

export default function TeamWorkspaceError({
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
      message="We couldn't load this team. This is usually temporary — try refreshing."
    />
  );
}
