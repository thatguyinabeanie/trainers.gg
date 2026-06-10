import { Suspense, type ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { requireSiteAdmin } from "@/lib/auth/require-admin";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { getImpersonationTarget } from "@/lib/impersonation/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AdminNav } from "./admin-nav";

/**
 * Async guard rendered under Suspense so the layout shell stays static under
 * cacheComponents — reading cookies directly in the layout body would block
 * every /admin route from prerendering. Primary route protection lives in
 * proxy.ts; this is the server-side defense-in-depth check, and it still
 * redirects non-admins when it resolves.
 */
async function AdminGuard() {
  await requireSiteAdmin();

  // Check if admin is currently impersonating someone
  const target = await getImpersonationTarget();
  if (!target) return null;

  const supabase = createServiceRoleClient();
  const { data: targetUser } = await supabase
    .from("users")
    .select("username")
    .eq("id", target.targetUserId)
    .maybeSingle();

  if (!targetUser) return null;

  return (
    <ImpersonationBanner
      targetUsername={targetUser.username ?? "unknown"}
      startedAt={target.startedAt}
    />
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AdminGuard />
      </Suspense>
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
          {/* usePathname() inside AdminNav is a request-time read — it needs
              its own Suspense boundary to keep the admin shell prerenderable. */}
          <Suspense fallback={<div className="mb-8 h-10 border-b" />}>
            <AdminNav />
          </Suspense>
          {children}
        </div>
      </PageContainer>
    </>
  );
}
