import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { StatsClient } from "../stats/stats-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = {
  title: "History — trainers.gg",
  description: "View your performance analytics and tournament history",
};

export default async function HistoryPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <>
      <PageHeader title="History" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <StatsClient />
      </div>
    </>
  );
}
