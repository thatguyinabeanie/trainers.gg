import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCommunityBySlug, hasCommunityAccess } from "@trainers/supabase";

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

  // Get organization
  const organization = await getCommunityBySlug(supabase, communitySlug);

  if (!organization) {
    notFound();
  }

  // Check if user has access (owner or staff)
  const hasAccess = await hasCommunityAccess(
    supabase,
    organization.id,
    user.id
  );

  if (!hasAccess) {
    redirect(`/communities/${communitySlug}`);
  }

  // No header or navigation -- the sidebar handles that
  return <>{children}</>;
}
