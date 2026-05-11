import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchResult {
  id: number;
  phase: number;
  round: number;
  table_number: number | null;
  match_label: string | null;
  player1: { id: number; username: string; display_name: string | null };
  player2: {
    id: number;
    username: string;
    display_name: string | null;
  } | null;
  winner_id: number | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchesTable({
  matches,
}: {
  // Accept the raw Supabase query shape — cast in parent
  matches: unknown[];
}) {
  const rows = matches as MatchResult[];

  // Group by phase + round
  const grouped = new Map<string, MatchResult[]>();
  for (const m of rows) {
    const key = `Phase ${m.phase} — Round ${m.round}`;
    const arr = grouped.get(key) ?? [];
    arr.push(m);
    grouped.set(key, arr);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([groupLabel, groupMatches]) => (
        <div key={groupLabel}>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            {groupLabel}
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Table</TableHead>
                <TableHead>Player 1</TableHead>
                <TableHead>Player 2</TableHead>
                <TableHead className="w-20">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupMatches.map((m) => {
                const p1Name = m.player1.display_name ?? m.player1.username;
                const p2Name = m.player2
                  ? (m.player2.display_name ?? m.player2.username)
                  : "BYE";
                const p1Won = m.winner_id === m.player1.id;
                const p2Won = m.player2 != null && m.winner_id === m.player2.id;

                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {m.match_label ?? m.table_number ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          p1Won ? "font-medium" : "text-muted-foreground"
                        }
                      >
                        {p1Name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          p2Won ? "font-medium" : "text-muted-foreground"
                        }
                      >
                        {p2Name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.winner_id === null ? (
                        <span className="text-muted-foreground text-xs">
                          {m.player2 ? "Tie" : "Bye"}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {p1Won ? "P1" : "P2"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
