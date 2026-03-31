import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { listMyCommunities, getCurrentUserAlts } from "@trainers/supabase";
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

  const [communities, alts, userRow] = await Promise.all([
    listMyCommunities(supabase, user.id).catch(() => []),
    getCurrentUserAlts(supabase).catch(() => []),
    supabase
      .from("users")
      .select("main_alt_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => data),
  ]);

  const mainAltId = userRow?.main_alt_id ?? null;

  // Read the dashboard alt filter cookie
  const cookieStore = await cookies();
  const dashboardAltCookie = cookieStore.get("dashboard-alt")?.value ?? null;
  // Only use the cookie value if it matches an actual alt for this user
  const selectedAltUsername =
    dashboardAltCookie && alts.some((a) => a.username === dashboardAltCookie)
      ? dashboardAltCookie
      : null;

  // Check which communities have active (live) tournaments
  const communityIds = communities.map((c) => c.id);
  let activeCommunityIds = new Set<number>();
  if (communityIds.length > 0) {
    const { data } = await supabase
      .from("tournaments")
      .select("community_id")
      .in("community_id", communityIds)
      .eq("status", "active");
    activeCommunityIds = new Set((data ?? []).map((t) => t.community_id));
  }

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

  const sidebarAlts = alts.map((a) => ({
    id: a.id,
    username: a.username,
    avatarUrl: a.avatar_url ?? null,
    isMain: a.id === mainAltId,
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
        alts={sidebarAlts}
        selectedAltUsername={selectedAltUsername}
        variant="inset"
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
