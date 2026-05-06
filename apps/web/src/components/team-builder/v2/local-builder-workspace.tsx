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
 * - Alt selector for choosing which alt to save under
 * - Load existing teams from any alt
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { getFormatById } from "@trainers/pokemon";
import {
  getCurrentUserAlts,
  getTeamsForUser,
  getTeamWithPokemon,
  type Tables,
  type TeamWithPokemon,
  type CrossAltTeamListItem,
} from "@trainers/supabase";

import { useAuthContext } from "@/components/auth/auth-provider";
import { useSupabase } from "@/lib/supabase";
import { teamsApi } from "@/lib/api/teams-client";

import { BuilderNav } from "@/components/builder-nav";

import { BuilderTopbar } from "./builder-topbar";
import { PersistenceProvider } from "./persistence/context";
import { createLocalPersistence } from "./persistence/local-persistence";
import {
  useLocalTeamStorage,
  clearLocalTeamStorage,
} from "./persistence/use-local-team-storage";
import { TeamWorkspaceV2 } from "./team-workspace-v2";

// =============================================================================
// Component
// =============================================================================

export function LocalBuilderWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, user } = useAuthContext();
  const supabase = useSupabase();

  const { team, setTeam, hydrated } = useLocalTeamStorage();
  const [isSaving, setIsSaving] = useState(false);

  // Eagerly fetched alts + teams for authenticated users
  const [alts, setAlts] = useState<Tables<"alts">[]>([]);
  const [selectedAltId, setSelectedAltId] = useState<number | null>(null);
  const [userTeams, setUserTeams] = useState<CrossAltTeamListItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const persistence = createLocalPersistence({
    setTeam: (updater) => setTeam(updater),
  });

  const format = team.format ? getFormatById(team.format) : undefined;

  // Fetch alts when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return;

    async function fetchAlts() {
      try {
        const fetchedAlts = await getCurrentUserAlts(supabase);
        setAlts(fetchedAlts);
        if (fetchedAlts.length > 0 && !selectedAltId) {
          setSelectedAltId(fetchedAlts[0]!.id);
        }
      } catch (err) {
        console.error("Failed to fetch alts:", err);
      }
    }

    fetchAlts();
  }, [isAuthenticated, authLoading, user]);

  // Fetch teams when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return;

    async function fetchTeams() {
      setTeamsLoading(true);
      try {
        const teams = await getTeamsForUser(supabase, user!.id);
        setUserTeams(teams);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      } finally {
        setTeamsLoading(false);
      }
    }

    fetchTeams();
  }, [isAuthenticated, authLoading, user]);

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
      // Use the selected alt, or fetch alts if not yet loaded
      let targetAlt: Tables<"alts"> | undefined;
      if (selectedAltId && alts.length > 0) {
        targetAlt = alts.find((a) => a.id === selectedAltId);
      }
      if (!targetAlt) {
        const fetchedAlts = await getCurrentUserAlts(supabase);
        if (!fetchedAlts || fetchedAlts.length === 0) {
          toast.error(
            "No profile found. Please complete your profile setup first."
          );
          setIsSaving(false);
          return;
        }
        targetAlt = fetchedAlts[0]!;
      }

      // Convert local pokemon slots to the payload format expected by save-local
      const pokemonPayloads = team.team_pokemon
        .filter((tp) => tp.pokemon !== null)
        .sort((a, b) => a.team_position - b.team_position)
        .map((tp) => {
          const p = tp.pokemon!;
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

  async function handleLoadTeam(teamId: number) {
    try {
      const fullTeam = await getTeamWithPokemon(supabase, teamId);
      if (!fullTeam) {
        toast.error("Team not found or you don't have access.");
        return;
      }

      // Load the team data into local storage (replaces current workspace)
      setTeam(
        () =>
          ({
            ...fullTeam,
            // Keep it as a local copy — don't preserve the original ID
            id: -1,
          }) as TeamWithPokemon
      );

      toast.success(`Loaded "${fullTeam.name}" into the builder.`);
    } catch (err) {
      console.error("Failed to load team:", err);
      toast.error("Failed to load team. Please try again.");
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
        alts={alts}
        persistence={persistence}
        selectedAltId={selectedAltId}
        onAltSelect={setSelectedAltId}
        renderHeader={(actions) => (
          <BuilderNav>
            <BuilderTopbar
              team={team}
              userTeams={userTeams}
              teamsLoading={teamsLoading}
              onLoadTeam={handleLoadTeam}
              onSaveToAccount={
                isAuthenticated && !authLoading
                  ? handleSaveToAccount
                  : undefined
              }
              isSaving={isSaving}
              {...actions}
            />
          </BuilderNav>
        )}
      />
    </PersistenceProvider>
  );
}
