import { cn } from "@/lib/utils";
import { Zap, Target, Trophy, Award } from "lucide-react";

interface EnhancedStatsProps {
  winRate: string;
  winRateSub: string;
  rating: string;
  ratingSub: string;
  record: string;
  recordSub: string;
  tournaments: string;
  tournamentsSub: string;
  tournamentsSubAccent?: boolean;
}

/**
 * Enhanced stat cards with icons and contextual coloring.
 * Server component — no client-side interactivity needed.
 */
export function EnhancedStats({
  winRate,
  winRateSub,
  rating,
  ratingSub,
  record,
  recordSub,
  tournaments,
  tournamentsSub,
  tournamentsSubAccent = false,
}: EnhancedStatsProps) {
  // Parse win rate for 4-tier conditional coloring
  const winRateNum = parseFloat(winRate);
  const hasGames = !isNaN(winRateNum) && winRate !== "0.0%";
  // Green >= 60%, teal 50-60%, neutral 40-50%, red < 40%
  const winRateTier = !hasGames
    ? "neutral"
    : winRateNum >= 60
      ? "high"
      : winRateNum >= 50
        ? "good"
        : winRateNum >= 40
          ? "neutral"
          : "low";

  // Parse rating
  const hasRating = rating !== "—" && rating !== "0";

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/30 p-3 lg:grid-cols-4">
      {/* Win Rate */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              winRateTier === "high" && "bg-emerald-500/10",
              winRateTier === "good" && "bg-teal-500/10",
              winRateTier === "low" && "bg-red-500/10",
              (winRateTier === "neutral") && "bg-primary/10"
            )}
          >
            <Zap
              className={cn(
                "size-3.5",
                winRateTier === "high" && "text-emerald-600 dark:text-emerald-400",
                winRateTier === "good" && "text-teal-600 dark:text-teal-400",
                winRateTier === "low" && "text-red-600 dark:text-red-400",
                (winRateTier === "neutral") && "text-primary"
              )}
            />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Win Rate
          </p>
        </div>
        <p
          className={cn(
            "mt-2.5 font-mono text-2xl font-bold leading-none tabular-nums",
            winRateTier === "high" && "text-emerald-600 dark:text-emerald-400",
            winRateTier === "good" && "text-teal-600 dark:text-teal-400",
            winRateTier === "low" && "text-red-600 dark:text-red-400"
          )}
        >
          {winRate}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[11px]">{winRateSub}</p>
      </div>

      {/* Rating */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Target className="size-3.5 text-blue-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Rating
          </p>
        </div>
        <p
          className={cn(
            "mt-2.5 font-mono text-2xl font-bold leading-none tabular-nums",
            !hasRating && "text-muted-foreground/50"
          )}
        >
          {rating}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[11px]">{ratingSub}</p>
      </div>

      {/* Record */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10">
            <Trophy className="size-3.5 text-purple-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Record
          </p>
        </div>
        <p className="mt-2.5 font-mono text-2xl font-bold leading-none tabular-nums">
          {record}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[11px]">{recordSub}</p>
      </div>

      {/* Tournaments */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
            <Award className="size-3.5 text-amber-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Tournaments
          </p>
        </div>
        <p className="mt-2.5 font-mono text-2xl font-bold leading-none tabular-nums">
          {tournaments}
        </p>
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            tournamentsSubAccent
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {tournamentsSub}
        </p>
      </div>
    </div>
  );
}
