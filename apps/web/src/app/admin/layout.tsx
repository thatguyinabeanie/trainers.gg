import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { requireSiteAdmin } from "@/lib/auth/require-admin";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { getImpersonationTarget } from "@/lib/impersonation/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Defense-in-depth: verify admin role server-side (proxy also checks)
  await requireSiteAdmin();

  // Check if admin is currently impersonating someone
  let impersonationInfo: {
    targetUsername: string;
    startedAt: string;
  } | null = null;

  const target = await getImpersonationTarget();
  if (target) {
    const supabase = createServiceRoleClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("username")
      .eq("id", target.targetUserId)
      .maybeSingle();

    if (targetUser) {
      impersonationInfo = {
        targetUsername: targetUser.username ?? "unknown",
        startedAt: target.startedAt,
      };
    }
  }

  return (
    <>
      {impersonationInfo && (
        <ImpersonationBanner
          targetUsername={impersonationInfo.targetUsername}
          startedAt={impersonationInfo.startedAt}
        />
      )}
      <PageContainer>
        <div className="w-full py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">Site Administration</h1>
              <p className="text-muted-foreground">
                Manage site-wide settings, users, and roles
              </p>
            </div>
          </div>
          <AdminNav />
          {children}
        </div>
      </PageContainer>
    </>
  );
}
