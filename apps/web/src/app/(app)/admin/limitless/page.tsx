"use client";

import { useState } from "react";
import {
  Database,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  imported: number;
}

interface StatsResponse {
  totalImported: number;
  formats: FormatStats[];
}

interface TournamentInfo {
  id: string;
  name: string;
  date: string;
  players: number;
  imported: boolean;
  importedAt: string | null;
}

interface ListResponse {
  format: string;
  formatId: string;
  total: number;
  imported: number;
  tournaments: TournamentInfo[];
}

interface ImportResult {
  tournamentId: string;
  name: string;
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}

// ---------------------------------------------------------------------------
// Edge function helper
// ---------------------------------------------------------------------------

async function callLimitlessImport<T>(
  body: Record<string, unknown>
): Promise<T> {
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

export default function LimitlessAdminPage() {
  // Stats via useSupabaseQuery (auto-loads on mount)
  const {
    data: stats,
    error: statsQueryError,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useSupabaseQuery(async (sb) => {
    const { data, error } = await sb.functions.invoke<{
      success: boolean;
      data: StatsResponse;
      error?: string;
    }>("limitless-import", { body: { action: "stats" } });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? "Unknown error");
    return data.data;
  }, []);
  const statsError = statsQueryError?.message ?? null;

  // Format listing state
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [listData, setListData] = useState<ListResponse | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

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

  // -------------------------------------------------------------------------
  // Load tournament list for a format
  // -------------------------------------------------------------------------

  async function loadFormat(format: string) {
    setSelectedFormat(format);
    setListLoading(true);
    setListError(null);
    setListData(null);
    setImportResults(new Map());
    try {
      const data = await callLimitlessImport<ListResponse>({
        action: "list",
        format,
      });
      setListData(data);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Failed to load tournaments"
      );
    } finally {
      setListLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Import a single tournament
  // -------------------------------------------------------------------------

  async function importOne(tournamentId: string, format: string) {
    setImportingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await callLimitlessImport<ImportResult>({
        action: "import",
        tournamentId,
        format,
      });
      setImportResults((prev) => new Map(prev).set(tournamentId, result));

      // Update list data to mark as imported
      setListData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          imported: prev.imported + 1,
          tournaments: prev.tournaments.map((t) =>
            t.id === tournamentId
              ? { ...t, imported: true, importedAt: new Date().toISOString() }
              : t
          ),
        };
      });
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
  // Batch import all not-yet-imported tournaments for the selected format
  // -------------------------------------------------------------------------

  async function importAll() {
    if (!listData || !selectedFormat) return;

    const notImported = listData.tournaments.filter((t) => !t.imported);
    if (notImported.length === 0) return;

    setBatchImporting(true);
    setBatchProgress({ current: 0, total: notImported.length });

    let completed = 0;
    for (const tournament of notImported) {
      setBatchProgress({ current: ++completed, total: notImported.length });
      await importOne(tournament.id, selectedFormat);
      // Small delay to avoid overwhelming the edge function
      if (completed < notImported.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setBatchImporting(false);
    setBatchProgress(null);
    // Refresh stats after batch import completes
    refetchStats();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Limitless Data Import</h2>
          <p className="text-muted-foreground text-sm">
            Import VGC tournament data from the Limitless API
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchStats}
          disabled={statsLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${statsLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {statsError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {statsError}
        </div>
      )}

      {/* Format cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Database className="mr-1.5 h-3.5 w-3.5" />
              {stats.totalImported} tournaments imported
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats.formats.map((f) => (
              <button
                key={f.limitlessCode}
                onClick={() => loadFormat(f.limitlessCode)}
                className={`hover:bg-accent rounded-lg border p-4 text-left transition-colors ${
                  selectedFormat === f.limitlessCode
                    ? "border-primary bg-accent"
                    : ""
                }`}
              >
                <div className="text-sm font-medium">{f.limitlessCode}</div>
                <div className="text-muted-foreground mt-1 font-mono text-xs">
                  {f.formatId}
                </div>
                <div className="mt-2">
                  <Badge
                    variant={f.imported > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {f.imported} imported
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {/* Tournament list for selected format */}
      {selectedFormat && (
        <Card>
          <CardContent className="pt-6">
            {listLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : listError ? (
              <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                {listError}
              </div>
            ) : listData ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">
                      {selectedFormat} — {listData.total} tournaments
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {listData.imported} imported,{" "}
                      {listData.total - listData.imported} remaining
                    </p>
                  </div>
                  {listData.total - listData.imported > 0 && (
                    <Button
                      onClick={importAll}
                      disabled={batchImporting}
                      size="sm"
                    >
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
                          Import All ({listData.total - listData.imported})
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead className="w-24">Date</TableHead>
                      <TableHead className="w-20 text-right">Players</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listData.tournaments.map((t) => {
                      const isImporting = importingIds.has(t.id);
                      const result = importResults.get(t.id);
                      const importFailed = typeof result === "string";

                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-muted-foreground font-mono text-xs">
                              {t.id}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.date.split("T")[0]}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {t.players}
                          </TableCell>
                          <TableCell>
                            {t.imported ? (
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
                              <Badge variant="secondary" className="text-xs">
                                Not imported
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!t.imported && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => importOne(t.id, selectedFormat)}
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
                            {typeof result === "object" && result !== null && (
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
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
