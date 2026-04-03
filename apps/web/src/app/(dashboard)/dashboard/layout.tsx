import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createClient,
  createServiceRoleClient,
  getUser,
} from "@/lib/supabase/server";
import {
  listMyCommunities,
  listAllCommunitiesForSudo,
  getCurrentUserAlts,
} from "@trainers/supabase";
import { isSudoModeActive, isSiteAdmin } from "@/lib/sudo/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";

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

  const [communities, alts, userRow, sudoActive, isAdmin] = await Promise.all([
    listMyCommunities(supabase, user.id).catch((err) => {
      console.error("[DashboardLayout] Failed to load communities:", err);
      return [];
    }),
    getCurrentUserAlts(supabase).catch((err) => {
      console.error("[DashboardLayout] Failed to load alts:", err);
      return [];
    }),
    supabase
      .from("users")
      .select("main_alt_id")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("[DashboardLayout] Failed to load user row:", error);
          return null;
        }
        return data;
      }),
    isSudoModeActive().catch((err) => {
      console.error("[DashboardLayout] Failed to check sudo mode:", err);
      return false;
    }),
    isSiteAdmin().catch(() => false),
  ]);

  // When sudo mode is active, merge all communities — user's own keep their real
  // role, communities the user doesn't belong to get role: "sudo".
  let allSudoCommunities: Awaited<
    ReturnType<typeof listAllCommunitiesForSudo>
  > | null = null;
  if (sudoActive) {
    try {
      const serviceRoleClient = createServiceRoleClient();
      allSudoCommunities = await listAllCommunitiesForSudo(serviceRoleClient);
    } catch (err) {
      console.error(
        "[DashboardLayout] Failed to load all communities for sudo:",
        err
      );
      allSudoCommunities = null;
    }
  }

  const mergedCommunities = (() => {
    if (!sudoActive || !allSudoCommunities) {
      return communities.map((c) => ({ ...c, isSudoAccess: false as const }));
    }
    const myIds = new Set(communities.map((c) => c.id));
    const sudoOnlyCommunities = allSudoCommunities
      .filter((c) => !myIds.has(c.id))
      .map((c) => ({ ...c, isOwner: false as const, isSudoAccess: true as const }));
    return [
      ...communities.map((c) => ({ ...c, isSudoAccess: false as const })),
      ...sudoOnlyCommunities,
    ];
  })();

  const mainAltId = userRow?.main_alt_id ?? null;

  // Read the dashboard alt filter cookie
  const cookieStore = await cookies();
  const dashboardAltCookie =
    cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;
  // Only use the cookie value if it matches an actual alt for this user
  const selectedAltUsername =
    dashboardAltCookie && alts.some((a) => a.username === dashboardAltCookie)
      ? dashboardAltCookie
      : null;

  // Check which communities have active (live) tournaments
  const communityIds = mergedCommunities.map((c) => c.id);
  let activeCommunityIds = new Set<number>();
  if (communityIds.length > 0) {
    const { data, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("community_id")
      .in("community_id", communityIds)
      .eq("status", "active");
    if (tournamentsError) {
      console.error(
        "[DashboardLayout] Failed to load active tournaments:",
        tournamentsError
      );
    }
    activeCommunityIds = new Set((data ?? []).map((t) => t.community_id));
  }

  const sidebarUser = {
    id: user.id,
    username: (user.user_metadata?.username as string) ?? "user",
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  const sidebarCommunities = mergedCommunities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? null,
    role: c.isSudoAccess
      ? ("sudo" as const)
      : c.isOwner
        ? ("owner" as const)
        : ("staff" as const),
    hasLiveTournament: activeCommunityIds.has(c.id),
    status: c.status,
  }));

  const sidebarAlts = alts.map((a) => ({
    id: a.id,
    username: a.username,
    avatarUrl: a.avatar_url ?? null,
    isMain: a.id === mainAltId,
  }));

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={sidebarUser}
        communities={sidebarCommunities}
        alts={sidebarAlts}
        selectedAltUsername={selectedAltUsername}
        isSiteAdmin={isAdmin}
        isSudoActive={sudoActive}
        variant="inset"
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
