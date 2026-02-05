import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
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
      <DashboardNav />
      {children}
    </PageContainer>
  );
}
