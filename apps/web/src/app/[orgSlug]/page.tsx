import { use } from "react";
import { OrganizationDetailClient } from "./organization-detail-client";

interface OrganizationPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default function OrganizationPage({ params }: OrganizationPageProps) {
  const { orgSlug } = use(params);

  return <OrganizationDetailClient orgSlug={orgSlug} />;
}
