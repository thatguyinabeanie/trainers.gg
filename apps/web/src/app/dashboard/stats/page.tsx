import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/feature-flags/check-flag";
import { StatsClient } from "./stats-client";

export const metadata = {
  title: "Stats & History",
  description: "View your performance analytics and tournament history",
};

export default async function StatsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasAccess = await checkFeatureAccess("dashboard_stats", user.id);

  if (!hasAccess) {
    redirect("/dashboard/overview");
  }

  return <StatsClient />;
}
