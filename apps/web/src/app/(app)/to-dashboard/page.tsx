import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyCommunities } from "@trainers/supabase";
import { CommunitySelectorClient } from "./community-selector-client";

export default async function TODashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard/community");
  }

  // Get all organizations where user is owner or staff
  const organizations = await listMyCommunities(supabase, user.id);

  // If user has no organizations, show empty state
  if (organizations.length === 0) {
    return <CommunitySelectorClient organizations={[]} />;
  }

  // If user has exactly 1 organization, redirect directly to it
  if (organizations.length === 1 && organizations[0]) {
    redirect(`/dashboard/community/${organizations[0].slug}`);
  }

  // Otherwise show the community selector
  return <CommunitySelectorClient organizations={organizations} />;
}
