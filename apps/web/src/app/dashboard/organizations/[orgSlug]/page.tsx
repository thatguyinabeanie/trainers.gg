"use client";

import { use } from "react";
import { OrgDashboardClient } from "./org-dashboard-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default function OrgDashboardPage({ params }: PageProps) {
  const { orgSlug } = use(params);

  return <OrgDashboardClient orgSlug={orgSlug} />;
}
