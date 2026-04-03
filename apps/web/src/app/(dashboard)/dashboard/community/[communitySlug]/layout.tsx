import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";

import { getCommunityBySlug, hasCommunityAccess } from "@trainers/supabase";

import {
  createClient,
  createServiceRoleClient,
  getUser,
} from "@/lib/supabase/server";
import { isSudoModeActive } from "@/lib/sudo/server";
import { SudoCommunityBanner } from "@/components/dashboard/sudo-community-banner";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function DashboardCommunityLayout({
  children,
  params,
}: LayoutProps) {
  const { communitySlug } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/community/${communitySlug}`);
  }

  const supabase = await createClient();

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

  // No header or navigation -- the sidebar handles that
  return (
    <>
      {isSudo && <SudoCommunityBanner communityName={organization.name} />}
      {children}
    </>
  );
}
