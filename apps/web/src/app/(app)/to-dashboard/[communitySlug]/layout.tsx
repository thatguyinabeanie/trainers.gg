import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";

import { getCommunityBySlug, hasCommunityAccess } from "@trainers/supabase";

import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { isSudoModeActive } from "@/lib/sudo/server";
import { SudoCommunityBanner } from "@/components/dashboard/sudo-community-banner";

import { TODashboardNav } from "./to-dashboard-nav";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function OrgDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const { communitySlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/community/${communitySlug}`);
  }

  // Check sudo mode once — reused for both the org lookup fallback and the access check
  const sudoActive = await isSudoModeActive();

  // Get organization — try service role if RLS may be blocking a non-active community
  let organization = await getCommunityBySlug(supabase, communitySlug);

  if (!organization) {
    if (sudoActive) {
      try {
        const serviceClient = createServiceRoleClient();
        organization = await getCommunityBySlug(serviceClient, communitySlug);
      } catch {
        // Service role client init or query failed — fall through to notFound()
      }
    }
    if (!organization) {
      notFound();
    }
  }

  // Check if user has access (owner or staff)
  // hasCommunityAccess returns true for owners and staff
  const hasAccess = await hasCommunityAccess(
    supabase,
    organization.id,
    user.id
  );

  let isSudo = false;

  if (!hasAccess) {
    if (!sudoActive) {
      redirect(`/communities/${communitySlug}`);
    }
    isSudo = true;
  }

  // isOwner is needed for UI (to show owner-only features in nav)
  // Sudo access never grants ownership — always false in sudo mode
  const isOwner = isSudo ? false : organization.owner_user_id === user.id;

  return (
    <div className="space-y-6">
      {/* Sudo mode banner — shown when admin views via sudo bypass */}
      {isSudo && <SudoCommunityBanner communityName={organization.name} />}

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
              Community Leader Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <TODashboardNav communitySlug={communitySlug} isOwner={isOwner} />

      {/* Content */}
      {children}
    </div>
  );
}
