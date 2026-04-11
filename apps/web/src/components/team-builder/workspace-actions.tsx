"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GitFork, Loader2 } from "lucide-react";

import { type TeamWithPokemon } from "@trainers/supabase";

import { forkTeamAction } from "@/actions/teams";
import { teamKeys } from "@/components/team-builder/teams-list-client";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/team-builder/export-menu";
import { ImportDialog } from "@/components/team-builder/import-dialog";

// =============================================================================
// Types
// =============================================================================

interface WorkspaceActionsProps {
  team: TeamWithPokemon;
  altId: number;
  handle: string;
}

// =============================================================================
// WorkspaceActions
// =============================================================================

/**
 * Action buttons for the team workspace header:
 * - Import — opens ImportDialog (Sheet with tabbed import)
 * - Export — ExportMenu dropdown (Showdown text / Pokepaste)
 * - Fork — duplicates this team and navigates to the new copy
 */
export function WorkspaceActions({
  team,
  altId,
  handle,
}: WorkspaceActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [isPendingFork, startForkTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Fork handler
  // ---------------------------------------------------------------------------

  function handleFork() {
    startForkTransition(async () => {
      const result = await forkTeamAction(team.id, altId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Team forked!");
      router.push(`/dashboard/alts/${handle}/teams/${result.data.id}`);
      void queryClient.invalidateQueries({ queryKey: teamKeys.all(altId) });
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center gap-2">
      {/* Import */}
      <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
        Import
      </Button>
      <ImportDialog
        team={team}
        altId={altId}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          void queryClient.invalidateQueries({ queryKey: teamKeys.all(altId) });
        }}
      />

      {/* Export */}
      <ExportMenu team={team} />

      {/* Fork */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleFork}
        disabled={isPendingFork}
      >
        {isPendingFork ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GitFork className="size-4" />
        )}
        Fork
      </Button>
    </div>
  );
}
