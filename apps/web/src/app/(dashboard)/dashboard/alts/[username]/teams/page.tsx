import { notFound, redirect } from "next/navigation";

import { getActiveFormats } from "@trainers/pokemon";
import { getAltByUsername, getTeamsForAltList } from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
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
  searchParams: Promise<{ format?: string }>;
}

export default async function TeamsPage({
  params,
  searchParams,
}: TeamsPageProps) {
  const { username } = await params;
  const { format: selectedFormat } = await searchParams;

  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClientReadOnly();

  const activeFormats = getActiveFormats();
  const alt = await getAltByUsername(supabase, username);

  if (!alt) {
    notFound();
  }

  const teams = await getTeamsForAltList(supabase, alt.id);

  return (
    <>
      <PageHeader title="Teams" />
      <TeamsListClient
        initialTeams={teams}
        altId={alt.id}
        handle={username}
        activeFormats={activeFormats}
        selectedFormat={selectedFormat}
      />
    </>
  );
}
