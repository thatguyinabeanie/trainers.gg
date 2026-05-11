"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  CloudDownload,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [queueBatchSize, setQueueBatchSize] = useState(500);

  // Manual sync state
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Search + sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<
    "name" | "format" | "date" | "players" | "status"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
  // Manual sync (calls edge function)
  // -------------------------------------------------------------------------

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await callEdgeFunction({ action: "sync" });
      refetchStats();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
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

    const toQueue = tournaments
      .filter((t) => !t.import_status || t.import_status === "failed")
      .slice(0, queueBatchSize);
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
  // Search + sort logic
  // -------------------------------------------------------------------------

  const filteredTournaments = (tournaments ?? []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.tournament_id.toLowerCase().includes(q) ||
      (FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id)
        .toLowerCase()
        .includes(q)
    );
  });

  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortColumn) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "format": {
        const fmtA = FORMAT_ID_TO_CODE[a.format_id] ?? a.format_id;
        const fmtB = FORMAT_ID_TO_CODE[b.format_id] ?? b.format_id;
        return dir * fmtA.localeCompare(fmtB);
      }
      case "date":
        return dir * a.date.localeCompare(b.date);
      case "players":
        return dir * ((a.player_count ?? 0) - (b.player_count ?? 0));
      case "status": {
        const statusOrder = (s: string | null) => {
          switch (s) {
            case "importing":
              return 0;
            case "queued":
              return 1;
            case "failed":
              return 2;
            default:
              return 3;
          }
        };
        return dir * (statusOrder(a.import_status) - statusOrder(b.import_status));
      }
      default:
        return 0;
    }
  });

  function handleSort(column: typeof sortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "name" ? "asc" : "desc");
    }
  }

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
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing} size="sm">
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudDownload className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
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

          {syncError && (
            <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {syncError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import queue management */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Import Queue</h2>
          <p className="text-muted-foreground text-sm">
            Queue tournaments for import. The cron processes queued tournaments
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
            <>
              <Input
                type="number"
                min={1}
                max={5000}
                value={queueBatchSize}
                onChange={(e) =>
                  setQueueBatchSize(
                    Math.max(1, parseInt(e.target.value, 10) || 1)
                  )
                }
                className="w-20"
              />
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
                    {Math.min(pendingTournaments.length, queueBatchSize)}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tournaments by name, ID, or format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tournament list from DB */}
        {tournamentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedTournaments.length > 0 ? (
          <>
            <div className="text-muted-foreground text-xs">
              Showing {sortedTournaments.length}
              {searchQuery
                ? ` of ${tournaments?.length ?? 0} tournaments`
                : " tournaments"}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      label="Tournament"
                      column="name"
                      current={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-32">
                    <SortableHeader
                      label="Format"
                      column="format"
                      current={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-24">
                    <SortableHeader
                      label="Date"
                      column="date"
                      current={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-20 text-right">
                    <SortableHeader
                      label="Players"
                      column="players"
                      current={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="justify-end"
                    />
                  </TableHead>
                  <TableHead className="w-32">
                    <SortableHeader
                      label="Status"
                      column="status"
                      current={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTournaments.map((t) => {
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
          </>
        ) : tournaments && tournaments.length > 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No tournaments match &quot;{searchQuery}&quot;
          </p>
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

// ---------------------------------------------------------------------------
// Sortable header sub-component
// ---------------------------------------------------------------------------

type SortColumn = "name" | "format" | "date" | "players" | "status";

function SortableHeader({
  label,
  column,
  current,
  direction,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  current: SortColumn;
  direction: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  className?: string;
}) {
  const isActive = current === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 text-left font-medium hover:text-foreground ${className ?? ""}`}
    >
      {label}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="text-muted-foreground/50 h-3.5 w-3.5" />
      )}
    </button>
  );
}
