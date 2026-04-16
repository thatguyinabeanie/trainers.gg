"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  type ChannelFailureRow,
  type DmFailureRow,
  type RoleSyncFailureRow,
} from "@trainers/supabase";

import { listRecentFailuresAction } from "@/actions/discord-integration";
import { Button } from "@/components/ui/button";

import { FailuresTable } from "./failures-table";

// =============================================================================
// Types
// =============================================================================

interface FailuresTabContentProps {
  /** Count from the overview — shown before details are loaded. */
  failureCount: number;
  serverId: number;
}

type FailuresData = {
  channelFailures: ChannelFailureRow[];
  dmFailures: DmFailureRow[];
  roleSyncFailures: RoleSyncFailureRow[];
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a count-only placeholder until the user clicks "Load details".
 * The full failures query is deferred to avoid slowing down the initial
 * page load — listRecentFailures touches three tables in parallel.
 */
export function FailuresTabContent({
  failureCount,
  serverId,
}: FailuresTabContentProps) {
  const [details, setDetails] = useState<FailuresData | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLoad() {
    startTransition(async () => {
      const result = await listRecentFailuresAction(serverId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDetails(result.data);
    });
  }

  if (details) {
    return (
      <FailuresTable
        channelFailures={details.channelFailures}
        dmFailures={details.dmFailures}
        roleSyncFailures={details.roleSyncFailures}
        serverId={serverId}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-muted-foreground text-sm">
        {failureCount} failure{failureCount !== 1 ? "s" : ""} in the last 24h.
        Load the details to retry or dismiss individual items.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={handleLoad}
        disabled={pending}
      >
        {pending ? "Loading…" : "Load details"}
      </Button>
    </div>
  );
}
