import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  listMyCommunities,
  getUnreadNotificationCount,
} from "@trainers/supabase";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

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
  const [communities, unreadInboxCount] = await Promise.all([
    listMyCommunities(supabase, user.id).catch(() => []),
    getUnreadNotificationCount(supabase).catch(() => 0),
  ]);

  const sidebarUser = {
    id: user.id,
    username: (user.user_metadata?.username as string) ?? "user",
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  const sidebarCommunities = communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? null,
    role: c.isOwner ? ("owner" as const) : ("staff" as const),
    hasLiveTournament: false, // TODO: query active tournaments per community
  }));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 56)",
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        user={sidebarUser}
        communities={sidebarCommunities}
        unreadInboxCount={unreadInboxCount}
        variant="inset"
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </header>
        <main className="flex flex-1 flex-col p-4 pt-0 md:p-6 md:pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
