import { createStaticClient } from "@/lib/supabase/server";
import { listTournamentsGrouped } from "@trainers/supabase";
import { TournamentsClient } from "./tournaments-client";

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function TournamentsPage() {
  const supabase = createStaticClient();
  const data = await listTournamentsGrouped(supabase, { completedLimit: 20 });

  return <TournamentsClient data={data} />;
}
