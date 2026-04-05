import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { CreateTournamentClient } from "./create-tournament-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function DashboardCreateTournamentPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;

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
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-6">
        <CreateTournamentClient communitySlug={communitySlug} />
      </div>
    </>
  );
}
