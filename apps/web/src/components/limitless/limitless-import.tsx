"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  CloudDownload,
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

interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
}

interface ImportResult {
  tournamentId: string;
  name: string;
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}

interface TournamentRow {
  tournament_id: string;
  name: string;
  format_id: string;
  date: string;
  player_count: number;
  data_imported_at: string | null;
}

// ---------------------------------------------------------------------------
// Edge function helper
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
  // Stats
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useSupabaseQuery(async () => {
    return callEdgeFunction<StatsResponse>({ action: "stats" });
  }, []);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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
          "tournament_id, name, format_id, date, player_count, data_imported_at"
        )
        .is("data_imported_at", null)
        .order("date", { ascending: false });

      if (selectedFormat !== "all") {
        query = query.eq("format_id", selectedFormat);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data ?? []) as TournamentRow[];
    },
    [selectedFormat, refreshKey]
  );

  // Import state
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<
    Map<string, ImportResult | string>
  >(new Map());

  // Batch import state
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Build reverse format lookup from stats (derived, not mutated)
  const FORMAT_ID_TO_CODE: Record<string, string> = {};
  if (stats) {
    for (const f of stats.formats) {
      FORMAT_ID_TO_CODE[f.formatId] = f.limitlessCode;
    }
  }

  // -------------------------------------------------------------------------
  // Sync tournament list (Stage 1)
  // -------------------------------------------------------------------------

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await callEdgeFunction<SyncResult>({ action: "sync" });
      setSyncResult(result);
      refetchStats();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Import single tournament (Stage 2)
  // -------------------------------------------------------------------------

  async function importOne(tournamentId: string, formatId: string) {
    const limitlessCode = FORMAT_ID_TO_CODE[formatId];
    if (!limitlessCode) return;

    setImportingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await callEdgeFunction<ImportResult>({
        action: "import",
        tournamentId,
        format: limitlessCode,
      });
      setImportResults((prev) => new Map(prev).set(tournamentId, result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setImportResults((prev) => new Map(prev).set(tournamentId, msg));
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Batch import (Stage 2 for all shown)
  // -------------------------------------------------------------------------

  async function importAll() {
    if (!tournaments || tournaments.length === 0) return;

    const toImport = tournaments.filter(
      (t) => !importResults.has(t.tournament_id)
    );
    if (toImport.length === 0) return;

    setBatchImporting(true);
    setBatchProgress({ current: 0, total: toImport.length });

    let completed = 0;
    for (const t of toImport) {
      setBatchProgress({ current: ++completed, total: toImport.length });
      await importOne(t.tournament_id, t.format_id);
      // 2s delay between imports to stay under rate limits
      if (completed < toImport.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setBatchImporting(false);
    setBatchProgress(null);
    refetchStats();
    setRefreshKey((k) => k + 1);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Available format IDs for the dropdown
  const formatOptions = (stats?.formats ?? []).filter((f) => f.synced > 0);

  return (
    <div className="space-y-6">
      {/* Stage 1: Sync */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Stage 1: Sync Tournament List
              </h2>
              <p className="text-muted-foreground text-sm">
                Fetch all VGC tournaments from the Limitless API and save
                metadata to the database.
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudDownload className="mr-2 h-4 w-4" />
                  Sync List
                </>
              )}
            </Button>
          </div>

          {syncError && (
            <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {syncError}
            </div>
          )}

          {syncResult && (
            <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              Synced {syncResult.synced} tournaments ({syncResult.skipped}{" "}
              skipped, {syncResult.total} total from API)
            </div>
          )}

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
            </div>
          ) : null}

          {statsError && (
            <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {statsError.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage 2: Import */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Stage 2: Import Tournament Data
            </h2>
            <p className="text-muted-foreground text-sm">
              Fetch standings, teams, and match results for synced tournaments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tournaments && tournaments.length > 0 && (
              <Button onClick={importAll} disabled={batchImporting} size="sm">
                {batchImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {batchProgress
                      ? `${batchProgress.current}/${batchProgress.total}`
                      : "Importing..."}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import All ({tournaments.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Format filter */}
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
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((t) => {
                const isImporting = importingIds.has(t.tournament_id);
                const result = importResults.get(t.tournament_id);
                const importFailed = typeof result === "string";
                const importDone =
                  typeof result === "object" && result !== null;

                return (
                  <TableRow key={t.tournament_id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
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
                      {importDone ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Imported
                        </Badge>
                      ) : importFailed ? (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!importDone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            importOne(t.tournament_id, t.format_id)
                          }
                          disabled={isImporting || batchImporting}
                        >
                          {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {importFailed && (
                        <div className="text-destructive mt-1 text-xs">
                          {result}
                        </div>
                      )}
                      {importDone && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {result.standings}s / {result.pokemon}p /{" "}
                          {result.matches}m
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
              ? "No tournaments synced yet. Click Sync List above."
              : "All synced tournaments have been imported."}
          </p>
        )}
      </div>
    </div>
  );
}
