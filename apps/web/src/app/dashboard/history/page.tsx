import { createSupabaseServerClient } from "@trainers/supabase/server";
import { getUserTournamentHistory } from "@trainers/supabase/queries/tournaments";
import { TournamentHistoryTable } from "@/components/dashboard/tournament-history-table";

export const metadata = {
  title: "Tournament History",
  description: "View your past tournament performances",
};

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
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
