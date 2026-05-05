"use client";

/**
 * DashboardBuilderWrapper
 *
 * Client component that wraps TeamWorkspaceV2 with API persistence for the
 * authenticated dashboard builder. Includes:
 * - API persistence with router.refresh() on mutation success
 * - localStorage crash-recovery backup with 7-day TTL
 * - Restore banner when backup differs from server state
 */

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

import { createApiPersistence } from "./persistence/api-persistence";
import { PersistenceProvider } from "./persistence/context";
import { useLocalBackup } from "./persistence/use-local-backup";
import { TeamWorkspaceV2 } from "./team-workspace-v2";

// =============================================================================
// Props
// =============================================================================

interface DashboardBuilderWrapperProps {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  username: string;
  alts: Tables<"alts">[];
}

// =============================================================================
// Component
// =============================================================================

export function DashboardBuilderWrapper({
  team,
  format,
  username,
  alts,
}: DashboardBuilderWrapperProps) {
  const router = useRouter();
  const { hasPendingRestore, backupSavedAt, dismiss, snapshot } =
    useLocalBackup(team);

  const persistence = createApiPersistence({
    onMutationSuccess: () => {
      router.refresh();
      // Snapshot current server state after successful mutation for crash recovery
      snapshot(team);
    },
  });

  function handleRestore() {
    // Restoring from backup requires a page reload with the backup data.
    // Since server is the source of truth and we can't "push" local state to it,
    // the restore would need to replay mutations. For now, inform the user.
    toast.info(
      "Restore from backup is not yet supported. Your backup has been preserved."
    );
    // TODO: Implement restore by replaying diff as API mutations
  }

  return (
    <PersistenceProvider persistence={persistence}>
      {hasPendingRestore && (
        <div className="border-warning/30 bg-warning/5 flex items-center gap-3 border-b px-4 py-2">
          <p className="text-warning-foreground text-sm">
            A backup from{" "}
            {backupSavedAt
              ? new Date(backupSavedAt).toLocaleString()
              : "a previous session"}{" "}
            contains unsaved changes.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className="text-warning-foreground hover:text-warning-foreground/80 text-xs font-medium underline underline-offset-2"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <TeamWorkspaceV2
        team={team}
        format={format}
        username={username}
        alts={alts}
        persistence={persistence}
      />
    </PersistenceProvider>
  );
}
