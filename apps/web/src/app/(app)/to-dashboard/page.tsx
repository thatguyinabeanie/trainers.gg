import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  listMyCommunities,
  listAllCommunitiesForSudo,
} from "@trainers/supabase";
import { isSudoModeActive } from "@/lib/sudo/server";
import { CommunitySelectorClient } from "./community-selector-client";

export default async function TODashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard/community");
  }

  // Get all organizations where user is owner or staff, and check sudo mode in parallel
  const [organizations, sudoActive] = await Promise.all([
    listMyCommunities(supabase, user.id),
    isSudoModeActive(),
  ]);

  // When sudo mode is active, merge all platform communities into the list.
  // User's own communities keep their real isOwner flag (isSudoAccess: false).
  // Communities the user doesn't belong to get isOwner: false, isSudoAccess: true.
  let allSudoCommunities: Awaited<
    ReturnType<typeof listAllCommunitiesForSudo>
  > | null = null;
  if (sudoActive) {
    try {
      allSudoCommunities = await listAllCommunitiesForSudo(
        createServiceRoleClient()
      );
    } catch {
      // Service role client init or query failed — fall back to user's own communities
      allSudoCommunities = null;
    }
  }

  const mergedOrganizations = (() => {
    if (!sudoActive || !allSudoCommunities) {
      return organizations.map((c) => ({ ...c, isSudoAccess: false as const }));
    }
    const myIds = new Set(organizations.map((c) => c.id));
    const sudoOnlyCommunities = allSudoCommunities
      .filter((c) => !myIds.has(c.id))
      .map((c) => ({
        ...c,
        isOwner: false as const,
        isSudoAccess: true as const,
      }));
    return [
      ...organizations.map((c) => ({ ...c, isSudoAccess: false as const })),
      ...sudoOnlyCommunities,
    ];
  })();

  // If user has no organizations, show empty state
  if (mergedOrganizations.length === 0) {
    return <CommunitySelectorClient organizations={[]} />;
  }

  // If user has exactly 1 organization and sudo is NOT active, redirect directly to it.
  // Skip the auto-redirect when sudo is active so admins see the full selector.
  if (
    !sudoActive &&
    mergedOrganizations.length === 1 &&
    mergedOrganizations[0]
  ) {
    redirect(`/dashboard/community/${mergedOrganizations[0].slug}`);
  }

  // Map to only the fields the client component needs — avoids serializing
  // full DB rows (subscription fields, owner_user_id, etc.) to the browser.
  const slimOrganizations = mergedOrganizations.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo_url: c.logo_url,
    tier: c.tier,
    status: c.status,
    isOwner: c.isOwner,
    isSudoAccess: c.isSudoAccess,
  }));

  // Show the community selector
  return (
    <CommunitySelectorClient
      organizations={slimOrganizations}
      sudoMode={sudoActive}
    />
  );
}
