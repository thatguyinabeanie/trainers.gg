import { notFound, redirect } from "next/navigation";

import { getActiveFormats } from "@trainers/pokemon";
import {
  getAltByUsername,
  getTeamsForAltList,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamsListClient } from "@/components/team-builder/teams-list-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Teams — trainers.gg",
  description: "Manage your Pokemon teams for competitive play",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface TeamsPageProps {
  params: Promise<{ username: string }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { username } = await params;

  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Service-role client: bypasses anon/authenticated GRANT restrictions on S-bucket tables
  // (teams, alts) after the Phase 2 Task 9 revoke. Safe inside this auth-gated page because
  // the data read (teams for a specific alt) is S-bucket public data — identical for all
  // viewers — and the user identity check is done above via getUser() before this call.
  // See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2 for the full rationale.
  const supabase = createServiceRoleClient();

  const activeFormats = getActiveFormats();

  // Run independent queries in parallel.
  const [accessResult, alt] = await Promise.all([
    hasTeamBuilderAccess(supabase, user.id),
    getAltByUsername(supabase, username),
  ]);

  if (accessResult.access === "error") {
    throw new Error(accessResult.reason);
  }
  if (!accessResult.access) {
    notFound();
  }
  if (!alt) {
    notFound();
  }

  const teams = await getTeamsForAltList(supabase, alt.id);

  return (
    <>
      <PageHeader title="Teams" />
      <DashboardContent>
        <TeamsListClient
          initialTeams={teams}
          altId={alt.id}
          handle={username}
          activeFormats={activeFormats}
        />
      </DashboardContent>
    </>
  );
}
