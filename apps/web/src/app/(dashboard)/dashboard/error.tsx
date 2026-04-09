"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        We couldn&apos;t load your dashboard. This is usually temporary — try
        refreshing.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
