import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { TournamentSettingsPageClient } from "./tournament-settings-page-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
    tournamentSlug: string;
  }>;
}

export default async function TournamentSettingsPage({ params }: PageProps) {
  const { communitySlug, tournamentSlug } = await params;

  return (
    <>
      <PageHeader>
        <Link
          href={`/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`}
          className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Manage
        </Link>
      </PageHeader>
      <DashboardContent>
        <TournamentSettingsPageClient
          communitySlug={communitySlug}
          tournamentSlug={tournamentSlug}
        />
      </DashboardContent>
    </>
  );
}
