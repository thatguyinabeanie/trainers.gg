"use client";

import OrgSettingsPage from "@/app/(app)/to-dashboard/[orgSlug]/settings/page";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function DashboardSettingsPage({ params }: PageProps) {
  // OrgSettingsPage is a client component that handles its own data fetching.
  // Pass params through directly -- both pages expect Promise<{ orgSlug }>.
  return <OrgSettingsPage params={params} />;
}
