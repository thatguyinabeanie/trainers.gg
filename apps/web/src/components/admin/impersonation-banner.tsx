"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endImpersonationAction } from "@/lib/impersonation/actions";

interface ImpersonationBannerProps {
  targetUsername: string;
  startedAt: string;
}

export function ImpersonationBanner({
  targetUsername,
  startedAt,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState("");
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    function updateElapsed() {
      const diff = Math.floor((Date.now() - start) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsed(`${minutes}m ${seconds}s`);
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  async function handleEndImpersonation() {
    setEnding(true);
    const result = await endImpersonationAction();
    if (result.success) {
      router.refresh();
    }
    setEnding(false);
  }

  return (
    <div className="bg-destructive text-destructive-foreground sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium">
      <Eye className="size-4" />
      <span>
        Impersonating <strong>@{targetUsername}</strong> ({elapsed})
      </span>
      <Button
        variant="outline"
        size="xs"
        onClick={handleEndImpersonation}
        disabled={ending}
        className="border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10 ml-2"
      >
        <X className="mr-1 size-3" />
        {ending ? "Ending..." : "End"}
      </Button>
    </div>
  );
}
