import Link from "next/link";

import { type getActiveMatch } from "@trainers/supabase";

type ActiveMatch = NonNullable<Awaited<ReturnType<typeof getActiveMatch>>>;

interface LiveMatchBarProps {
  match: ActiveMatch;
}

export function LiveMatchBar({ match }: LiveMatchBarProps) {
  return (
    <div className="mb-3.5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
      {/* Green pulse dot */}
      <span className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>

      {/* Match info */}
      <span className="min-w-0 flex-1 text-emerald-800">
        <strong className="font-semibold">{match.tournamentName}</strong>
        {" — "}
        Round {match.roundNumber}
        {match.opponent && (
          <>
            {" · You vs "}
            <span className="font-medium">{match.opponent.username}</span>
          </>
        )}
        {match.table != null && ` · Table ${match.table}`}
      </span>

      <Link
        href={`/tournaments/${match.tournamentSlug}`}
        className="shrink-0 font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
      >
        Go to match →
      </Link>
    </div>
  );
}

export type { ActiveMatch };
