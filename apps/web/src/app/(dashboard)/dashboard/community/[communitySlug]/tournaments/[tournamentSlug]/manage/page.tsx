import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { TournamentManageClient } from "./tournament-manage-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
    tournamentSlug: string;
  }>;
}

export default async function DashboardTournamentManagePage({
  params,
}: PageProps) {
  const { communitySlug, tournamentSlug } = await params;

  return (
    <>
      <PageHeader>
        <Link
          href={`/dashboard/community/${communitySlug}/tournaments`}
          className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tournaments
        </Link>
      </PageHeader>
      <DashboardContent>
        <TournamentManageClient
          communitySlug={communitySlug}
          tournamentSlug={tournamentSlug}
        />
      </DashboardContent>
    </>
  );
}
