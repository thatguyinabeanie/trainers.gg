"use client";

/**
 * LocalBuilderWorkspace
 *
 * Wrapper component for the public /builder page. Creates a local team backed
 * by localStorage and wires up the TeamWorkspaceV2 with LocalPersistence.
 *
 * Features:
 * - Anonymous team building (no account required)
 * - Automatic localStorage persistence (debounced)
 * - Hydrates from previous session on page load
 * - "Sign in to save" CTA → auth → return with ?action=save → auto-persist
 * - "Save to account" button for users already authenticated
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { getFormatById } from "@trainers/pokemon";
import { getCurrentUserAlts } from "@trainers/supabase";

import { useAuthContext } from "@/components/auth/auth-provider";
import { useSupabase } from "@/lib/supabase";
import { teamsApi } from "@/lib/api/teams-client";

import { PersistenceProvider } from "./persistence/context";
import { createLocalPersistence } from "./persistence/local-persistence";
import {
  useLocalTeamStorage,
  clearLocalTeamStorage,
} from "./persistence/use-local-team-storage";
import { TeamWorkspaceV2 } from "./team-workspace-v2";
import { Topbar } from "./topbar";

// =============================================================================
// Component
// =============================================================================

export function LocalBuilderWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const supabase = useSupabase();

  const { team, setTeam, hydrated } = useLocalTeamStorage();
  const [isSaving, setIsSaving] = useState(false);

  const persistence = createLocalPersistence({
    setTeam: (updater) => setTeam(updater),
  });

  const format = team.format ? getFormatById(team.format) : undefined;

  // Auto-trigger save when returning from auth with ?action=save
  const actionParam = searchParams.get("action");
  useEffect(() => {
    if (
      actionParam === "save" &&
      isAuthenticated &&
      !authLoading &&
      hydrated &&
      !isSaving
    ) {
      handleSaveToAccount();
    }
  }, [actionParam, isAuthenticated, authLoading, hydrated]);

  async function handleSaveToAccount() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Fetch user's alts to find the target alt
      const alts = await getCurrentUserAlts(supabase);
      if (!alts || alts.length === 0) {
        toast.error("No profile found. Please complete your profile setup first.");
        setIsSaving(false);
        return;
      }

      // Use the first alt (primary) — most users have exactly one
      const targetAlt = alts[0]!;

      // Convert local pokemon slots to the payload format expected by save-local
      const pokemonPayloads = team.team_pokemon
        .filter((tp) => tp.pokemon !== null)
        .sort((a, b) => a.team_position - b.team_position)
        .map((tp) => {
          const p = tp.pokemon!;
          // Strip internal fields, keep only the pokemon data columns
          const { id: _id, ...pokemonData } = p;
          return pokemonData;
        });

      const result = await teamsApi.saveLocal({
        altId: targetAlt.id,
        name: team.name || "Untitled Team",
        format: team.format || "gen9vgc2026regi",
        pokemon: pokemonPayloads as Record<string, unknown>[],
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to save team to your account.");
        setIsSaving(false);
        return;
      }

      // Success — clear localStorage and redirect to the new team
      clearLocalTeamStorage();
      toast.success("Team saved to your account!");
      router.push(result.data!.redirectUrl);
    } catch (error) {
      console.error("Save to account failed:", error);
      toast.error("Something went wrong. Please try again.");
      setIsSaving(false);
    }
  }

  // Show minimal loading skeleton while hydrating from localStorage
  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading builder...</div>
      </div>
    );
  }

  // Show saving overlay when auto-saving after auth redirect
  if (isSaving && actionParam === "save") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-muted-foreground text-sm">
          Saving your team to your account...
        </div>
      </div>
    );
  }

  return (
    <PersistenceProvider persistence={persistence}>
      <TeamWorkspaceV2
        team={team}
        format={format}
        alts={[]}
        persistence={persistence}
        renderHeader={(actions) => (
          <header className="relative flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <Topbar
              team={team}
              format={format}
              username="local"
              alts={[]}
              mode="local"
              onSaveToAccount={
                isAuthenticated && !authLoading
                  ? handleSaveToAccount
                  : undefined
              }
              isSaving={isSaving}
              {...actions}
            />
          </header>
        )}
      />
    </PersistenceProvider>
  );
}
