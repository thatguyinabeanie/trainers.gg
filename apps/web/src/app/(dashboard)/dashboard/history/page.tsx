import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { StatsClient } from "../stats/stats-client";

export const metadata = {
  title: "History — trainers.gg",
  description: "View your performance analytics and tournament history",
};

export default async function HistoryPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <StatsClient />;
}
