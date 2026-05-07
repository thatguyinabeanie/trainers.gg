import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { TournamentsClient } from "./tournaments-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata = {
  title: "Tournaments — trainers.gg",
  description:
    "View your tournament history, upcoming events, and live matches",
};

export default async function TournamentsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const selectedAltUsername =
    cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;

  return (
    <>
      <PageHeader title="Tournaments" />
      <DashboardContent>
        <div className="flex flex-1 flex-col gap-4">
          <TournamentsClient selectedAltUsername={selectedAltUsername} />
        </div>
      </DashboardContent>
    </>
  );
}
