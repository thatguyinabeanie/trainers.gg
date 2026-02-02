import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { requireSiteAdmin } from "@/lib/auth/require-admin";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Defense-in-depth: verify admin role server-side (proxy also checks)
  await requireSiteAdmin();

  return (
    <PageContainer variant="wide" noPadding>
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
  );
}
