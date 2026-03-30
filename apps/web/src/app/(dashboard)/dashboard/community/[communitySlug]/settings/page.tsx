"use client";

import OrgSettingsPage from "@/app/(app)/to-dashboard/[communitySlug]/settings/page";
import { PageHeader } from "@/components/dashboard/page-header";

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default function DashboardSettingsPage({ params }: PageProps) {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* OrgSettingsPage is a client component that handles its own data fetching. */}
        <OrgSettingsPage params={params} />
      </div>
    </>
  );
}
