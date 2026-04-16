import { notFound, redirect } from "next/navigation";

import { getActiveFormats } from "@trainers/pokemon";
import {
  getTeamsForUser,
  getCurrentUserAlts,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { AllTeamsClient } from "@/components/team-builder/all-teams-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Team Builder — trainers.gg",
  description: "Manage your Pokemon teams across all alts",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AllTeamsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClientReadOnly();

  // Gate on team builder feature flag
  const canAccess = await hasTeamBuilderAccess(supabase, user.id);
  if (!canAccess) {
    notFound();
  }

  const [teams, alts, activeFormats] = await Promise.all([
    getTeamsForUser(supabase, user.id),
    getCurrentUserAlts(supabase),
    Promise.resolve(getActiveFormats()),
  ]);

  return (
    <>
      <PageHeader title="Team Builder" />
      <AllTeamsClient
        initialTeams={teams}
        alts={alts}
        activeFormats={activeFormats}
      />
    </>
  );
}
