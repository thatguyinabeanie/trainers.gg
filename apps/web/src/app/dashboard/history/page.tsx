import { createClient } from "@/lib/supabase/server";
import { getUserTournamentHistory } from "@trainers/supabase";
import { TournamentHistoryTable } from "@/components/dashboard/tournament-history-table";

export const metadata = {
  title: "Tournament History",
  description: "View your past tournament performances",
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const history = await getUserTournamentHistory(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tournament History</h1>
        <p className="text-muted-foreground text-sm">
          View your past tournament performances across all your alts
        </p>
      </div>

      <TournamentHistoryTable data={history} />
    </div>
  );
}
