"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type RealtimeStatus = "connected" | "disconnected" | "error";

interface RealtimeStatusBadgeProps {
  status: RealtimeStatus;
}

export function RealtimeStatusBadge({ status }: RealtimeStatusBadgeProps) {
  if (status === "connected") {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>Live</span>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          Reconnecting to live updates...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Live updates disconnected.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Refresh page
        </Button>
      </AlertDescription>
    </Alert>
  );
}
