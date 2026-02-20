import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/feature-flags/check-flag";
import { getTournamentInvitationsReceived } from "@trainers/supabase";
import { PageContainer } from "@/components/layout/page-container";
import { DashboardNav } from "./dashboard-nav";

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
  const [showStats, invitations] = await Promise.all([
    checkFeatureAccess("dashboard_stats", user.id),
    getTournamentInvitationsReceived(supabase),
  ]);

  const now = new Date();
  const pendingInvitationsCount =
    invitations?.filter(
      (inv) =>
        inv.status === "pending" &&
        (!inv.expires_at || new Date(inv.expires_at) > now)
    ).length ?? 0;

  return (
    <PageContainer variant="wide">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your account, profiles, and tournament activity
          </p>
        </div>
      </div>
      <DashboardNav
        showStats={showStats}
        pendingInvitationsCount={pendingInvitationsCount}
      />
      {children}
    </PageContainer>
  );
}
