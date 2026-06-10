import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createClient,
  createServiceRoleClient,
  getUser,
} from "@/lib/supabase/server";
import { needsOnboarding } from "@/lib/proxy-routes";
import {
  listMyCommunities,
  listAllCommunitiesForSudo,
  getCurrentUserAlts,
  hasTeamBuilderAccess,
  getCommunityIdsWithFeatureAccess,
} from "@trainers/supabase";
import { isSudoModeActive, isSiteAdmin } from "@/lib/sudo/server";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";
import { SupabaseHashErrorHandler } from "@/components/auth/supabase-hash-error-handler";

/** Sidebar placeholder shown while the auth + community data resolves. */
function DashboardSidebarSkeleton() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {Array.from({ length: 8 }, (_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Async sidebar loader rendered under Suspense.
 *
 * WHY: under cacheComponents, reading cookies()/auth in the layout body
 * itself blocks every dashboard route from prerendering a static shell
 * (page-level loading.tsx boundaries sit BELOW the layout, so they can't
 * help). The layout returns static chrome; all request-data reads live
 * here behind the skeleton fallback. Route protection is still enforced
 * primarily by proxy.ts — the redirect below remains as defense-in-depth.
 */
async function DashboardSidebarLoader() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const supabase = await createClient();

  const [communities, alts, userRow, sudoActive, isAdmin, teamBuilderAccess] =
    await Promise.all([
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
      isSiteAdmin().catch((err) => {
        console.error("[DashboardLayout] Failed to check site admin:", err);
        return false;
      }),
      hasTeamBuilderAccess(supabase, user.id).catch((err) => {
        console.error(
          "[DashboardLayout] Failed to check team builder access:",
          err
        );
        return { access: "error" as const, reason: String(err) };
      }),
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
      .map((c) => ({
        ...c,
        isOwner: false as const,
        isSudoAccess: true as const,
      }));
    return [
      ...communities.map((c) => ({ ...c, isSudoAccess: false as const })),
      ...sudoOnlyCommunities,
    ];
  })();

  const mainAltId = userRow?.main_alt_id ?? null;

  const isOnboarding = needsOnboarding(
    user.user_metadata?.username as string | undefined
  );

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
      .eq("status", "active")
      .limit(500);
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

  // Check which communities have Discord integration enabled
  const discordEnabledIds =
    communityIds.length > 0
      ? await getCommunityIdsWithFeatureAccess(
          supabase,
          "discord_integration",
          communityIds
        )
      : new Set<number>();

  const sidebarCommunitiesWithFlags = sidebarCommunities.map((c) => ({
    ...c,
    discordEnabled: discordEnabledIds.has(c.id),
  }));

  const sidebarAlts = alts.map((a) => ({
    id: a.id,
    username: a.username,
    avatarUrl: a.avatar_url ?? null,
    isMain: a.id === mainAltId,
  }));

  return (
    <DashboardSidebar
      user={sidebarUser}
      communities={sidebarCommunitiesWithFlags}
      alts={sidebarAlts}
      selectedAltUsername={selectedAltUsername}
      isOnboarding={isOnboarding}
      isSiteAdmin={isAdmin}
      isSudoActive={sudoActive}
      hasTeamBuilderAccess={teamBuilderAccess.access === true}
      variant="inset"
    />
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SupabaseHashErrorHandler />
      <Suspense fallback={<DashboardSidebarSkeleton />}>
        <DashboardSidebarLoader />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
