import { Suspense } from "react";
import { redirect } from "next/navigation";
import { type Metadata } from "next";

import { getFormatById } from "@trainers/pokemon";
import { getTeamWithPokemon, getCurrentUserAlts } from "@trainers/supabase/queries";

import { createClientReadOnly } from "@/lib/supabase/server";
import { BuilderAccountWorkspace } from "@/components/team-builder/builder-account-workspace";
import { LocalBuilderWorkspace } from "@/components/team-builder/local-builder-workspace";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

export default async function BuilderTeamEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Local drafts are handled entirely client-side.
  if (id.startsWith("local-")) {
    return (
      <div className="h-full overflow-hidden">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Loading builder...
              </div>
            </div>
          }
        >
          {/* key={id} forces a fresh mount per draft so useLocalDraft hydrates cleanly */}
          <LocalBuilderWorkspace draftId={id} key={id} />
        </Suspense>
      </div>
    );
  }

  // Account teams: support both bare numeric IDs and the "acct-" prefixed form
  // produced by the save-local redirect (e.g. /builder/t/acct-42 or /builder/t/42).
  const numericId = Number(id.startsWith("acct-") ? id.slice("acct-".length) : id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    redirect("/builder");
  }

  // Use the authenticated, RLS-scoped read client so only owned/public teams resolve.
  const supabase = await createClientReadOnly();

  // Require authentication before fetching — an expired or absent session would
  // otherwise cause getTeamWithPokemon to silently return null (same as not found),
  // and getCurrentUserAlts to return an empty array, giving no meaningful error.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/builder");
  }

  const [team, alts] = await Promise.all([
    getTeamWithPokemon(supabase, numericId),
    getCurrentUserAlts(supabase),
  ]);

  if (!team) {
    redirect("/builder");
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return <BuilderAccountWorkspace team={team} format={format} alts={alts} />;
}
