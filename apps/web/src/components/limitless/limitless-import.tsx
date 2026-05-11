"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import { LIMITLESS_TO_FORMAT } from "@/lib/limitless";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormatStats {
  limitlessCode: string;
  formatId: string;
  synced: number;
  imported: number;
}

interface StatsResponse {
  totalSynced: number;
  totalImported: number;
  formats: FormatStats[];
}

interface TournamentRow {
  tournament_id: string;
  name: string;
  format_id: string;
  date: string;
  player_count: number;
  data_imported_at: string | null;
  import_status: string | null;
  import_requested_at: string | null;
  import_error: string | null;
  import_attempts: number | null;
}

// ---------------------------------------------------------------------------
// Edge function helper (for stats only — sync+import are now crons)
// ---------------------------------------------------------------------------

async function callEdgeFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    data: T;
    error?: string;
  }>("limitless-import", { body });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Unknown error");
  return data.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LimitlessImport() {
  // Stats from edge function
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useSupabaseQuery(async () => {
    return callEdgeFunction<StatsResponse>({ action: "stats" });
  }, []);

  // Format filter + tournament list from DB
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Tournaments from DB (not-yet-imported)
  const { data: tournaments, isLoading: tournamentsLoading } = useSupabaseQuery(
    async (sb) => {
      let query = sb
        .schema("limitless")
        .from("tournaments")
        .select(
          "tournament_id, name, format_id, date, player_count, data_imported_at, import_status, import_requested_at, import_error, import_attempts"
        )
        .is("data_imported_at", null)
        .order("date", { ascending: false });

      if (selectedFormat !== "all") {
        query = query.eq("format_id", selectedFormat);
      }

      const limit = selectedFormat !== "all" ? 5000 : 500;
      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return (data ?? []) as TournamentRow[];
    },
    [selectedFormat, refreshKey]
  );

  // Queue action state
  const [queuingIds, setQueuingIds] = useState<Set<string>>(new Set());
  const [batchQueuing, setBatchQueuing] = useState(false);

  // Build reverse format lookup from stats
  const FORMAT_ID_TO_CODE: Record<string, string> = {};
  if (stats) {
    for (const f of stats.formats) {
      FORMAT_ID_TO_CODE[f.formatId] = f.limitlessCode;
    }
  }
  // Also include known mappings
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    FORMAT_ID_TO_CODE[fmtId] = code;
  }

  // -------------------------------------------------------------------------
  // Queue single tournament for import
  // -------------------------------------------------------------------------

  async function queueOne(tournamentId: string) {
    setQueuingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const { error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_requested_at: new Date().toISOString(),
          import_status: "queued",
          import_error: null,
        })
        .eq("tournament_id", tournamentId);

      if (error) throw error;
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to queue tournament:", err);
    } finally {
      setQueuingIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Batch queue all visible pending tournaments
  // -------------------------------------------------------------------------

  async function queueAll() {
    if (!tournaments || tournaments.length === 0) return;

    const toQueue = tournaments.filter(
      (t) => !t.import_status || t.import_status === "failed"
    );
    if (toQueue.length === 0) return;

    setBatchQueuing(true);
    try {
      const ids = toQueue.map((t) => t.tournament_id);
      const { error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_requested_at: new Date().toISOString(),
          import_status: "queued",
          import_error: null,
        })
        .in("tournament_id", ids);

      if (error) throw error;
      setRefreshKey((k) => k + 1);
      refetchStats();
    } catch (err) {
      console.error("Failed to batch queue:", err);
    } finally {
      setBatchQueuing(false);
    }
  }

  // Count of tournaments still pending (not queued, not importing)
  const pendingTournaments = (tournaments ?? []).filter(
    (t) => !t.import_status || t.import_status === "failed"
  );
  const queuedCount = (tournaments ?? []).filter(
    (t) => t.import_status === "queued"
  ).length;
  const importingCount = (tournaments ?? []).filter(
    (t) => t.import_status === "importing"
  ).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const formatOptions = (stats?.formats ?? []).filter((f) => f.synced > 0);

  return (
    <div className="space-y-6">
      {/* Sync info card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tournament Sync</h2>
              <p className="text-muted-foreground text-sm">
                Tournament list syncs automatically every 5 minutes via cron.
                Import queue processes every 15 minutes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshKey((k) => k + 1);
                refetchStats();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Stats summary */}
          {statsLoading ? (
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-40" />
            </div>
          ) : stats ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {stats.totalSynced} synced
              </Badge>
              <Badge variant="default" className="text-sm">
                {stats.totalImported} fully imported
              </Badge>
              <Badge variant="outline" className="text-sm">
                {stats.totalSynced - stats.totalImported} pending import
              </Badge>
              {queuedCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {queuedCount} queued
                </Badge>
              )}
              {importingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/10 text-sm text-blue-700 dark:text-blue-400"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {importingCount} importing
                </Badge>
              )}
            </div>
          ) : null}

          {statsError && (
            <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {statsError.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import queue management */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Import Queue</h2>
          <p className="text-muted-foreground text-sm">
            Queue tournaments for import. The cron processes one tournament
            every 15 minutes.
          </p>
        </div>

        {/* Format filter + Queue All button */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedFormat}
            onValueChange={(v) => setSelectedFormat(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {formatOptions.map((f) => (
                <SelectItem key={f.formatId} value={f.formatId}>
                  {f.limitlessCode} — {f.synced - f.imported} pending
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {pendingTournaments.length > 0 && (
            <Button onClick={queueAll} disabled={batchQueuing} size="sm">
              {batchQueuing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Queue{" "}
                  {selectedFormat !== "all"
                    ? (FORMAT_ID_TO_CODE[selectedFormat] ?? selectedFormat)
                    : "All (first 500)"}{" "}
                  ({pendingTournaments.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tournament list from DB */}
        {tournamentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tournaments && tournaments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead className="w-32">Format</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-20 text-right">Players</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((t) => {
                const isQueuing = queuingIds.has(t.tournament_id);

                return (
                  <TableRow key={t.tournament_id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t.name}</span>
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}/standings`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {t.tournament_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell className="text-right text-sm">
                      {t.player_count}
                    </TableCell>
                    <TableCell>
                      <ImportStatusBadge tournament={t} />
                    </TableCell>
                    <TableCell>
                      {(!t.import_status || t.import_status === "failed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => queueOne(t.tournament_id)}
                          disabled={isQueuing || batchQueuing}
                        >
                          {isQueuing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {t.import_error && (
                        <div className="text-destructive mt-1 max-w-48 truncate text-xs">
                          {t.import_error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {stats?.totalSynced === 0
              ? "No tournaments synced yet. The sync cron will populate this shortly."
              : "All synced tournaments have been imported or queued."}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge sub-component
// ---------------------------------------------------------------------------

function ImportStatusBadge({ tournament }: { tournament: TournamentRow }) {
  const { import_status, import_attempts } = tournament;

  switch (import_status) {
    case "queued":
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
        >
          <Clock className="mr-1 h-3 w-3" />
          Queued
        </Badge>
      );
    case "importing":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400"
        >
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Importing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Imported
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Failed{import_attempts ? ` (${import_attempts}x)` : ""}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      );
  }
}
