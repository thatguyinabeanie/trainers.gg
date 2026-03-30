import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { listMyCommunities } from "@trainers/supabase";
import { OrgSelectorClient } from "@/app/(app)/to-dashboard/org-selector-client";

export default async function DashboardCommunityPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard/community");
  }

  const supabase = await createClient();

  // Get all organizations where user is owner or staff
  const organizations = await listMyCommunities(supabase, user.id);

  // If user has no organizations, show empty state
  if (organizations.length === 0) {
    return <OrgSelectorClient organizations={[]} />;
  }

  // If user has exactly 1 organization, redirect directly to it
  if (organizations.length === 1 && organizations[0]) {
    redirect(`/dashboard/community/${organizations[0].slug}`);
  }

  // Otherwise show the community selector
  return <OrgSelectorClient organizations={organizations} />;
}
