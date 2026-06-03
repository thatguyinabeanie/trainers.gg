"use client";

import { useState } from "react";
import { Cloud, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  provisionAllCommunitiesAction,
  type ProvisionAllResult,
} from "@/app/(app)/admin/communities/actions";

export function ProvisionAllCommunitiesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProvisionAllResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleProvision() {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const response = await provisionAllCommunitiesAction();

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error ?? "Unknown error");
    }

    setIsLoading(false);
  }

  function handleClose() {
    setDialogOpen(false);
    // Reset state when closing after completion
    if (!isLoading) {
      setResult(null);
      setError(null);
    }
  }

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Cloud className="size-4" />
            Provision PDS
          </Button>
        }
      />
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Provision All Communities</AlertDialogTitle>
            <AlertDialogDescription>
              {!result && !error && !isLoading && (
                <>
                  This will create PDS accounts for all communities that
                  don&apos;t have one yet. Communities with active accounts will
                  be skipped.
                </>
              )}
              {isLoading && (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Provisioning communities... This may take a moment.
                </span>
              )}
              {error && (
                <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="size-4 shrink-0" />
                  {error}
                </span>
              )}
              {result && (
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {result.message}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Per-community results */}
          {result && result.results.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
              {result.results.map((r) => (
                <div
                  key={r.communityId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-xs">@{r.handle}</span>
                  {r.success ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span
                      className="max-w-48 truncate text-red-600 dark:text-red-400"
                      title={r.error}
                    >
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            {!result && !error ? (
              <>
                <AlertDialogCancel disabled={isLoading}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault(); // Keep dialog open during operation
                    handleProvision();
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    "Provision"
                  )}
                </AlertDialogAction>
              </>
            ) : (
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
