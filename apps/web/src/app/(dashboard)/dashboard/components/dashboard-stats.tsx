import { StatCard } from "./stat-card";

interface DashboardStatsProps {
  winRate: string;
  winRateSub: string;
  rating: string;
  ratingSub: string;
  record: string;
  recordSub: string;
  tournaments: string;
  tournamentsSub: string;
  /** Whether the tournaments subtitle should use an accent color */
  tournamentsSubAccent?: boolean;
}

export function DashboardStats({
  winRate,
  winRateSub,
  rating,
  ratingSub,
  record,
  recordSub,
  tournaments,
  tournamentsSub,
  tournamentsSubAccent = false,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Win Rate" value={winRate} sub={winRateSub} />
      <StatCard label="Rating" value={rating} sub={ratingSub} />
      <StatCard label="Record" value={record} sub={recordSub} />
      <StatCard
        label="Tournaments"
        value={tournaments}
        sub={tournamentsSub}
        subClassName={tournamentsSubAccent ? "text-emerald-600" : undefined}
      />
    </div>
  );
}
