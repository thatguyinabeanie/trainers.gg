import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  listMyCommunities,
  getUnreadNotificationCount,
} from "@trainers/supabase";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const supabase = await createClient();
  const [communities, unreadInboxCount] = await Promise.all([
    listMyCommunities(supabase, user.id).catch(() => []),
    getUnreadNotificationCount(supabase).catch(() => 0),
  ]);

  // Check which communities have active (live) tournaments
  const communityIds = communities.map((c) => c.id);
  const { data: activeTournaments } =
    communityIds.length > 0
      ? await supabase
          .from("tournaments")
          .select("community_id")
          .in("community_id", communityIds)
          .eq("status", "active")
      : { data: [] };

  const activeCommunityIds = new Set(
    (activeTournaments ?? []).map((t) => t.community_id)
  );

  const sidebarUser = {
    id: user.id,
    username: (user.user_metadata?.username as string) ?? "user",
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  const sidebarCommunities = communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? null,
    role: c.isOwner ? ("owner" as const) : ("staff" as const),
    hasLiveTournament: activeCommunityIds.has(c.id),
  }));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 56)",
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        user={sidebarUser}
        communities={sidebarCommunities}
        unreadInboxCount={unreadInboxCount}
        variant="inset"
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
