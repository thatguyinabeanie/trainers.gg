import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizationBySlug,
  isOrganizationMember,
} from "@trainers/supabase";
import { TODashboardNav } from "./to-dashboard-nav";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function OrgDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirect=/to-dashboard/${orgSlug}`);
  }

  // Get organization
  const organization = await getOrganizationBySlug(supabase, orgSlug);

  if (!organization) {
    notFound();
  }

  // Check if user has access (owner or staff)
  // isOrganizationMember returns true for owners and staff
  const hasAccess = await isOrganizationMember(
    supabase,
    organization.id,
    user.id
  );

  if (!hasAccess) {
    redirect(`/organizations/${orgSlug}`);
  }

  // isOwner is needed for UI (to show owner-only features in nav)
  const isOwner = organization.owner_user_id === user.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {organization.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
              <span className="text-xl font-bold">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            <p className="text-muted-foreground text-sm">
              Tournament Organizer Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <TODashboardNav orgSlug={orgSlug} isOwner={isOwner} />

      {/* Content */}
      {children}
    </div>
  );
}
