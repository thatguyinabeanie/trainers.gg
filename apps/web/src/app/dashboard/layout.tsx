import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { DashboardNav } from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageContainer variant="wide" noPadding>
      <div className="w-full py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your account, profiles, and tournament activity
            </p>
          </div>
        </div>
        <DashboardNav />
        {children}
      </div>
    </PageContainer>
  );
}
