"use client";

import { Button } from "@/components/ui/button";

interface DashboardErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
}

export function DashboardErrorFallback({
  error,
  reset,
  message = "This is usually temporary — try refreshing.",
}: DashboardErrorFallbackProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      <Button onClick={reset}>Try again</Button>
      {error.digest && (
        <p className="text-muted-foreground mt-1 text-xs">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
