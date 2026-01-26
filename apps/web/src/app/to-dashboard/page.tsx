import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyOrganizations } from "@trainers/supabase";
import { OrgSelectorClient } from "./org-selector-client";

export default async function TODashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/to-dashboard");
  }

  // Get all organizations where user is owner or staff
  const organizations = await listMyOrganizations(supabase, user.id);

  // If user has no organizations, show empty state
  if (organizations.length === 0) {
    return <OrgSelectorClient organizations={[]} userId={user.id} />;
  }

  // If user has exactly 1 organization, redirect directly to it
  if (organizations.length === 1 && organizations[0]) {
    redirect(`/to-dashboard/${organizations[0].slug}`);
  }

  // Otherwise show the org selector
  return <OrgSelectorClient organizations={organizations} userId={user.id} />;
}
