"use client";

/**
 * BuilderAccountWorkspace
 *
 * Client component for the /builder/t/[id] editor route when editing an
 * account-backed (API-persisted) team. Provides API persistence + crash-recovery
 * for the /builder/t/[id] account-team editor.
 *
 * Features:
 * - API persistence with router.refresh() on mutation success
 * - localStorage crash-recovery backup with 7-day TTL
 * - Restore banner when backup differs from server state
 * - Full BuilderNav chrome: breadcrumb, topbar, auth section
 * - Export menu (Copy Showdown / Pokepaste)
 */

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

import { BuilderNav } from "@/components/builder-nav";

import { ExportMenu } from "./export-menu";
import { createApiPersistence } from "./persistence/api-persistence";
import { PersistenceProvider } from "./persistence/context";
import { useLocalBackup } from "./persistence/use-local-backup";
import { TeamWorkspaceV2 } from "./team-workspace";
import { Topbar } from "./topbar";

// =============================================================================
// Props
// =============================================================================

interface BuilderAccountWorkspaceProps {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  alts: Tables<"alts">[];
}

// =============================================================================
// Component
// =============================================================================

export function BuilderAccountWorkspace({
  team,
  format,
  alts,
}: BuilderAccountWorkspaceProps) {
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
        <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/5 px-4 py-2">
          <p className="text-sm text-amber-600 dark:text-amber-400">
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
              className="text-amber-600 hover:text-amber-600/80 dark:text-amber-400 dark:hover:text-amber-400/80 text-xs font-medium underline underline-offset-2"
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
        alts={alts}
        persistence={persistence}
        isAuthenticated
        renderHeader={(actions) => (
          <BuilderNav>
            <Topbar
              team={team}
              mode="api"
              exportMenu={<ExportMenu team={team} />}
              {...actions}
            />
          </BuilderNav>
        )}
      />
    </PersistenceProvider>
  );
}
