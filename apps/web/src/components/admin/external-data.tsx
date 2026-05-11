"use client";

import { useState, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  CloudDownload,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Users,
  XCircle,
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

import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import { LIMITLESS_TO_FORMAT } from "@/lib/limitless";
import {
  discoverRk9Events,
  scrapeRk9Roster,
  scrapeRk9TeamsBatch,
} from "@/actions/rk9";
import {
  queueTournamentForImport,
  batchQueueTournaments,
  triggerLimitlessSync,
} from "@/actions/limitless";
import { getSiteConfig, setSiteConfig } from "@/actions/site-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RK9EventRow {
  event_id: string;
  name: string;
  tier: string;
  date_start: string;
  date_end: string | null;
  location_city: string | null;
  location_country: string | null;
  player_count: number | null;
  has_team_lists: boolean;
  import_status: string;
  import_error: string | null;
}

interface LimitlessTournamentRow {
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

interface LimitlessStatsResponse {
  totalSynced: number;
  totalImported: number;
  formats: {
    limitlessCode: string;
    formatId: string;
    synced: number;
    imported: number;
  }[];
}

// Unified row that merges both sources
interface UnifiedRow {
  id: string;
  source: "rk9" | "limitless";
  name: string;
  category: string; // tier for RK9, format code for Limitless
  date: string;
  playerCount: number | null;
  status: string; // normalized status
  statusDetail: string; // original status for display
  error: string | null;
  // Source-specific extras
  rk9?: RK9EventRow;
  limitless?: LimitlessTournamentRow;
}

type SourceFilter = "all" | "rk9" | "limitless";
type StatusFilter = "all" | "pending" | "queued" | "importing" | "complete" | "failed" | "in-progress";
type SortDirection = "asc" | "desc";
type SortColumn =
  | "name"
  | "source"
  | "category"
  | "date"
  | "playerCount"
  | "status"
  | "queueOrder";

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(dateStart: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStart > today;
}

// Normalize RK9 status to a shared vocabulary
function normalizeRk9Status(status: string, upcoming: boolean): string {
  if (upcoming) return "upcoming";
  switch (status) {
    case "complete":
      return "complete";
    case "roster":
    case "teams":
      return "in-progress";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

// Normalize Limitless status
function normalizeLimitlessStatus(status: string | null): string {
  switch (status) {
    case "completed":
      return "complete";
    case "queued":
      return "queued";
    case "importing":
      return "importing";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

// Sortable header cell
function SortableHeader({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = sort.column === column;
  return (
    <div className={cn("flex h-10 items-center px-2 font-medium whitespace-nowrap", className)}>
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onSort(column)}
      >
        {label}
        {isActive ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </div>
  );
}

function toggleSort(current: SortState, column: SortColumn): SortState {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection
): number {
  const aVal = a ?? "";
  const bVal = b ?? "";
  let result: number;
  if (typeof aVal === "number" && typeof bVal === "number") {
    result = aVal - bVal;
  } else {
    result = String(aVal).localeCompare(String(bVal));
  }
  return direction === "desc" ? -result : result;
}

async function callLimitlessStats(): Promise<LimitlessStatsResponse> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    data: LimitlessStatsResponse;
    error?: string;
  }>("limitless-import", { body: { action: "stats" } });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Unknown error");
  return data.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExternalData() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({
    column: "date",
    direction: "desc",
  });

  // Auto-import state
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [autoImportLoading, setAutoImportLoading] = useState(true);
  const autoImportRef = useRef(false);

  // RK9 state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<
    Map<string, { type: string; scraped?: number; total?: number }>
  >(new Map());

  // Limitless state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [queuingIds, setQueuingIds] = useState<Set<string>>(new Set());
  const [batchQueuing, setBatchQueuing] = useState(false);

  // -------------------------------------------------------------------------
  // Load auto-import setting from DB
  // -------------------------------------------------------------------------

  useEffect(() => {
    getSiteConfig<boolean>("auto_import_enabled").then((result) => {
      if (result.success && result.data !== null) {
        setAutoImportEnabled(result.data);
        autoImportRef.current = result.data;
      }
      setAutoImportLoading(false);
    });
  }, []);

  async function handleToggleAutoImport(checked: boolean) {
    setAutoImportEnabled(checked);
    autoImportRef.current = checked;
    await setSiteConfig("auto_import_enabled", checked);
  }

  // -------------------------------------------------------------------------
  // RK9 data
  // -------------------------------------------------------------------------

  const {
    data: rk9Events,
    error: rk9Error,
    isLoading: rk9Loading,
    isFetching: rk9Fetching,
  } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .schema("rk9")
        .from("events")
        .select(
          "event_id, name, tier, date_start, date_end, location_city, location_country, player_count, has_team_lists, import_status, import_error"
        )
        .order("date_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RK9EventRow[];
    },
    [refreshKey]
  );

  // -------------------------------------------------------------------------
  // Limitless data
  // -------------------------------------------------------------------------

  const {
    data: limitlessStats,
    error: limitlessStatsError,
    isLoading: limitlessStatsLoading,
    isFetching: limitlessStatsFetching,
  } = useSupabaseQuery(async () => {
    return callLimitlessStats();
  }, [refreshKey]);

  const {
    data: limitlessTournaments,
    error: limitlessError,
    isLoading: limitlessLoading,
    isFetching: limitlessFetching,
  } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .schema("limitless")
        .from("tournaments")
        .select(
          "tournament_id, name, format_id, date, player_count, data_imported_at, import_status, import_requested_at, import_error, import_attempts"
        )
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LimitlessTournamentRow[];
    },
    [refreshKey]
  );

  // Build format lookup
  const FORMAT_ID_TO_CODE: Record<string, string> = {};
  if (limitlessStats) {
    for (const f of limitlessStats.formats) {
      FORMAT_ID_TO_CODE[f.formatId] = f.limitlessCode;
    }
  }
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    FORMAT_ID_TO_CODE[fmtId] = code;
  }

  // -------------------------------------------------------------------------
  // Auto-poll when there are active items
  // -------------------------------------------------------------------------

  const limitlessQueuedCount = (limitlessTournaments ?? []).filter(
    (t) => t.import_status === "queued"
  ).length;
  const limitlessImportingCount = (limitlessTournaments ?? []).filter(
    (t) => t.import_status === "importing"
  ).length;
  const hasActiveQueue =
    limitlessQueuedCount > 0 ||
    limitlessImportingCount > 0 ||
    activeJobs.size > 0;

  useEffect(() => {
    if (!hasActiveQueue) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActiveQueue]);

  // -------------------------------------------------------------------------
  // Build unified rows
  // -------------------------------------------------------------------------

  const unifiedRows: UnifiedRow[] = [];

  for (const e of rk9Events ?? []) {
    const upcoming = isUpcoming(e.date_start);
    unifiedRows.push({
      id: `rk9-${e.event_id}`,
      source: "rk9",
      name: e.name,
      category: e.tier,
      date: e.date_start,
      playerCount: e.player_count,
      status: normalizeRk9Status(e.import_status, upcoming),
      statusDetail: upcoming ? "upcoming" : e.import_status,
      error: e.import_error,
      rk9: e,
    });
  }

  for (const t of limitlessTournaments ?? []) {
    unifiedRows.push({
      id: `limitless-${t.tournament_id}`,
      source: "limitless",
      name: t.name,
      category: FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id,
      date: t.date,
      playerCount: t.player_count,
      status: normalizeLimitlessStatus(t.import_status),
      statusDetail: t.import_status ?? "pending",
      error: t.import_error,
      limitless: t,
    });
  }

  // -------------------------------------------------------------------------
  // Filter + sort
  // -------------------------------------------------------------------------

  const filteredRows = unifiedRows
    .filter((row) => {
      // Source filter
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "in-progress") {
          const activeStatuses = ["queued", "importing", "in-progress", "roster", "teams"];
          if (!activeStatuses.includes(row.status)) return false;
        } else if (row.status !== statusFilter) {
          return false;
        }
      }
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !row.name.toLowerCase().includes(q) &&
          !row.id.toLowerCase().includes(q) &&
          !row.category.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = sort;
      switch (column) {
        case "name":
          return compareValues(a.name, b.name, direction);
        case "source":
          return compareValues(a.source, b.source, direction);
        case "category":
          return compareValues(a.category, b.category, direction);
        case "date":
          return compareValues(a.date, b.date, direction);
        case "playerCount":
          return compareValues(a.playerCount, b.playerCount, direction);
        case "status":
          return compareValues(a.status, b.status, direction);
        case "queueOrder": {
          const aTime = a.limitless?.import_requested_at ?? "";
          const bTime = b.limitless?.import_requested_at ?? "";
          return compareValues(aTime, bTime, direction);
        }
        default:
          return 0;
      }
    });

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const rk9Total = rk9Events?.length ?? 0;
  const rk9Imported =
    rk9Events?.filter(
      (e) =>
        e.import_status === "roster" ||
        e.import_status === "teams" ||
        e.import_status === "complete"
    ).length ?? 0;

  const limitlessPendingCount = (limitlessTournaments ?? []).filter(
    (t) => !t.import_status || t.import_status === "failed"
  ).length;

  const rk9ActiveCount = activeJobs.size;

  const nextQueuedItem = (limitlessTournaments ?? [])
    .filter((t) => t.import_status === "queued" && t.import_requested_at)
    .sort(
      (a, b) =>
        new Date(a.import_requested_at!).getTime() -
        new Date(b.import_requested_at!).getTime()
    )[0] ?? null;

  function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // -------------------------------------------------------------------------
  // RK9 actions
  // -------------------------------------------------------------------------

  async function handleDiscover() {
    setIsDiscovering(true);
    setDiscoverMessage(null);
    try {
      const result = await discoverRk9Events();
      if (result.success) {
        const count = result.events?.length ?? 0;
        const live = result.sources?.live ?? 0;
        const archive = result.sources?.archive ?? 0;
        setDiscoverMessage(
          `Discovered ${count} events (${live} live, ${archive} from archive)`
        );
        setRefreshKey((k) => k + 1);
      } else {
        setDiscoverMessage(`Error: ${result.error}`);
      }
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleScrapeRoster(eventId: string) {
    setActiveJobs((prev) => new Map(prev).set(eventId, { type: "roster" }));
    try {
      await scrapeRk9Roster(eventId);
    } finally {
      setActiveJobs((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
      setRefreshKey((k) => k + 1);
    }
  }

  async function handleScrapeTeams(eventId: string) {
    setActiveJobs((prev) =>
      new Map(prev).set(eventId, { type: "teams", scraped: 0, total: 0 })
    );
    try {
      let done = false;
      while (!done) {
        const result = await scrapeRk9TeamsBatch(eventId);
        if (!result.success) break;
        done = result.done ?? false;
        setActiveJobs((prev) =>
          new Map(prev).set(eventId, {
            type: "teams",
            scraped: result.scraped ?? 0,
            total: result.total ?? 0,
          })
        );
      }
    } finally {
      setActiveJobs((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
      setRefreshKey((k) => k + 1);
    }
  }

  // -------------------------------------------------------------------------
  // Limitless actions
  // -------------------------------------------------------------------------

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await triggerLimitlessSync();
      if (!result.success) throw new Error(result.error);
      setSyncMessage("Sync completed successfully");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncMessage(
        `Error: ${err instanceof Error ? err.message : "Sync failed"}`
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleQueueOne(tournamentId: string) {
    setQueuingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await queueTournamentForImport(tournamentId);
      if (!result.success) throw new Error(result.error);
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

  async function handleQueueAll() {
    const toQueue = (limitlessTournaments ?? []).filter(
      (t) => !t.import_status || t.import_status === "failed"
    );
    if (toQueue.length === 0) return;

    setBatchQueuing(true);
    try {
      const ids = toQueue.map((t) => t.tournament_id);
      const result = await batchQueueTournaments(ids);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to batch queue:", err);
    } finally {
      setBatchQueuing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Auto-import loop
  // When enabled, process one pending item at a time from each source.
  // -------------------------------------------------------------------------

  const autoImportRunning = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  useEffect(() => {
    if (!autoImportEnabled || autoImportRunning.current) return;
    if (rk9Loading || limitlessLoading) return;

    // Find next RK9 item to process
    const nextRk9Pending = (rk9Events ?? []).find(
      (e) =>
        !isUpcoming(e.date_start) &&
        (e.import_status === "pending" || e.import_status === "failed") &&
        !activeJobs.has(e.event_id)
    );

    const nextRk9Roster = (rk9Events ?? []).find(
      (e) =>
        !isUpcoming(e.date_start) &&
        (e.import_status === "roster" ||
          e.import_status === "teams" ||
          (e.import_status === "complete" && !e.has_team_lists)) &&
        !activeJobs.has(e.event_id)
    );

    // Find next Limitless item to queue
    const nextLimitlessPending = (limitlessTournaments ?? []).find(
      (t) =>
        (!t.import_status || t.import_status === "failed") &&
        !queuingIds.has(t.tournament_id)
    );

    async function processNext() {
      autoImportRunning.current = true;
      try {
        // Process RK9: roster first, then teams
        if (nextRk9Pending && autoImportRef.current) {
          await handleScrapeRoster(nextRk9Pending.event_id);
        } else if (nextRk9Roster && autoImportRef.current) {
          await handleScrapeTeams(nextRk9Roster.event_id);
        }

        // Process Limitless: queue pending tournaments in batches
        if (nextLimitlessPending && autoImportRef.current) {
          const pending = (limitlessTournaments ?? []).filter(
            (t) => !t.import_status || t.import_status === "failed"
          );
          if (pending.length > 0) {
            const ids = pending.slice(0, 100).map((t) => t.tournament_id);
            await batchQueueTournaments(ids);
            setRefreshKey((k) => k + 1);
          }
        }
      } finally {
        autoImportRunning.current = false;
      }
    }

    processNext();
  }, [
    autoImportEnabled,
    rk9Events,
    limitlessTournaments,
    rk9Loading,
    limitlessLoading,
    activeJobs,
    queuingIds,
  ]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isLoading = rk9Loading || limitlessLoading;
  const isFetching = rk9Fetching || limitlessFetching;
  const queryError = rk9Error || limitlessError;

  return (
    <div className="space-y-6">
      {/* Header: Auto-import toggle + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            {autoImportLoading ? (
              <Skeleton className="h-[18px] w-[32px] rounded-full" />
            ) : (
              <Switch
                checked={autoImportEnabled}
                onCheckedChange={handleToggleAutoImport}
              />
            )}
            Auto-import
          </label>
          {autoImportEnabled && (
            <span className="text-muted-foreground text-xs">
              Automatically processes discovered events
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isFetching}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-2">
            <Globe className="text-muted-foreground h-4 w-4" />
            <div>
              <p className="text-2xl font-bold">{rk9Total}</p>
              <p className="text-muted-foreground text-xs">RK9 events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{rk9Imported}</p>
              <p className="text-muted-foreground text-xs">RK9 imported</p>
            </div>
          </div>
          {limitlessStatsLoading && !limitlessStats ? (
            <Skeleton className="h-10 w-40" />
          ) : limitlessStats ? (
            <>
              <div className="flex items-center gap-2">
                <Globe className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-2xl font-bold">
                    {limitlessStats.totalSynced}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Limitless synced
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {limitlessStats.totalImported}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Limitless imported
                  </p>
                </div>
              </div>
            </>
          ) : null}
          {limitlessQueuedCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400"
            >
              <Clock className="mr-1 h-3 w-3" />
              {limitlessQueuedCount} queued
            </Badge>
          )}
          {limitlessImportingCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-blue-500/10 text-sm text-blue-700 dark:text-blue-400"
            >
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {limitlessImportingCount} importing
            </Badge>
          )}
          {limitlessStatsError && (
            <p className="text-xs text-red-500">
              {limitlessStatsError.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* RK9 discover */}
        <div className="flex flex-col gap-1">
          <Button onClick={handleDiscover} disabled={isDiscovering} size="sm">
            {isDiscovering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Discover RK9
          </Button>
          {discoverMessage && (
            <p
              className={cn(
                "text-xs",
                discoverMessage.startsWith("Error")
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {discoverMessage}
            </p>
          )}
        </div>

        {/* Limitless sync */}
        <div className="flex flex-col gap-1">
          <Button onClick={handleSync} disabled={syncing} size="sm">
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="mr-2 h-4 w-4" />
            )}
            Sync Limitless
          </Button>
          {syncMessage && (
            <p
              className={cn(
                "text-xs",
                syncMessage.startsWith("Error")
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {syncMessage}
            </p>
          )}
        </div>

        {/* Batch queue Limitless */}
        {limitlessPendingCount > 0 && (
          <Button
            onClick={handleQueueAll}
            disabled={batchQueuing}
            size="sm"
            variant="outline"
          >
            {batchQueuing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Queue All Limitless ({limitlessPendingCount})
          </Button>
        )}
      </div>

      {/* Queue status strip */}
      {(limitlessQueuedCount > 0 || limitlessImportingCount > 0 || rk9ActiveCount > 0) && (
        <div className="bg-muted/30 flex items-center gap-4 rounded-lg border px-4 py-2 text-sm">
          {limitlessImportingCount > 0 && (
            <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {limitlessImportingCount} importing now
            </span>
          )}
          {rk9ActiveCount > 0 && (
            <span className="flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {rk9ActiveCount} RK9 processing
            </span>
          )}
          {limitlessQueuedCount > 0 && nextQueuedItem && (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Next up:
              <span className="max-w-[300px] truncate font-medium">
                {nextQueuedItem.name}
              </span>
              <span className="text-xs">
                (queued {formatRelativeTime(nextQueuedItem.import_requested_at!)})
              </span>
            </span>
          )}
          {limitlessQueuedCount > 0 && !nextQueuedItem && (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {limitlessQueuedCount} queued
            </span>
          )}
          {limitlessQueuedCount > 0 && (
            <span className="text-muted-foreground ml-auto text-xs">
              {limitlessQueuedCount} in queue
            </span>
          )}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, ID, or format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={sourceFilter}
          onValueChange={(v) => setSourceFilter(v as SourceFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="rk9">RK9</SelectItem>
            <SelectItem value="limitless">Limitless</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="importing">Importing</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {queryError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {queryError.message}
        </div>
      )}

      {/* Table */}
      {/* Show skeleton only on initial load, not background refreshes */}
      {isLoading && !rk9Events && !limitlessTournaments ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {unifiedRows.length === 0
            ? "No events found. Discover RK9 events or sync Limitless tournaments."
            : "No events match your filters."}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="text-muted-foreground px-4 py-2 text-xs">
            Showing {filteredRows.length} of {unifiedRows.length} events
          </div>

          {/* Fixed header row */}
          <div className="grid grid-cols-[1fr_80px_90px_110px_70px_110px_100px_80px] border-b">
            <SortableHeader
              column="name"
              label="Event"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="source"
              label="Source"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="category"
              label="Type"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="date"
              label="Date"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="playerCount"
              label="Players"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="status"
              label="Status"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <SortableHeader
              column="queueOrder"
              label="Queue"
              sort={sort}
              onSort={(c) => setSort(toggleSort(sort, c))}
            />
            <div className="flex h-10 items-center justify-end px-2 font-medium whitespace-nowrap">
              Actions
            </div>
          </div>

          {/* Virtualized body */}
          <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = filteredRows[virtualRow.index];
                if (!row) return null;
                const isUpcomingRow = row.status === "upcoming";
                const externalUrl =
                  row.source === "rk9"
                    ? `https://rk9.gg/tournament/${row.rk9!.event_id}`
                    : `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}`;
                const subLinks =
                  row.source === "rk9" && !isUpcomingRow
                    ? [
                        { label: "Roster", href: `https://rk9.gg/roster/${row.rk9!.event_id}` },
                        { label: "Pairings", href: `https://rk9.gg/pairings/${row.rk9!.event_id}` },
                        { label: "Standings", href: `https://rk9.gg/standings/${row.rk9!.event_id}` },
                      ]
                    : row.source === "limitless"
                      ? [
                          { label: "Standings", href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/standings` },
                          { label: "Pairings", href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/pairings` },
                          { label: "Players", href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/players` },
                        ]
                      : [];
                return (
                  <div
                    key={row.id}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className={cn(
                      "grid grid-cols-[1fr_80px_90px_110px_70px_110px_100px_80px] border-b transition-colors hover:bg-muted/50",
                      isUpcomingRow && "opacity-60"
                    )}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {row.name}
                        </a>
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {row.rk9?.location_city && (
                        <p className="text-muted-foreground text-xs">
                          {row.rk9.location_city}
                          {row.rk9.location_country ? `, ${row.rk9.location_country}` : ""}
                        </p>
                      )}
                      {subLinks.length > 0 && (
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          {subLinks.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                      {row.error && (
                        <p className="mt-0.5 text-xs text-red-500">{row.error}</p>
                      )}
                    </div>
                    <div className="flex items-center p-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          row.source === "rk9"
                            ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                            : "border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400"
                        )}
                      >
                        {row.source === "rk9" ? "RK9" : "Limitless"}
                      </Badge>
                    </div>
                    <div className="flex items-center p-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {row.category}
                      </Badge>
                    </div>
                    <div className="flex items-center p-2 text-sm">
                      {row.date}
                    </div>
                    <div className="flex items-center p-2 text-sm">
                      {row.playerCount ?? "—"}
                    </div>
                    <div className="flex items-center p-2">
                      <StatusBadge row={row} activeJobs={activeJobs} />
                    </div>
                    <div className="flex items-center p-2">
                      {row.status === "queued" && row.limitless?.import_requested_at && (
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                          {formatRelativeTime(row.limitless.import_requested_at)}
                        </span>
                      )}
                      {row.status === "importing" && row.limitless?.import_requested_at && (
                        <span className="whitespace-nowrap text-xs text-blue-600 dark:text-blue-400">
                          started {formatRelativeTime(row.limitless.import_requested_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end p-2">
                      <RowActions
                        row={row}
                        activeJobs={activeJobs}
                        queuingIds={queuingIds}
                        batchQueuing={batchQueuing}
                        onScrapeRoster={handleScrapeRoster}
                        onScrapeTeams={handleScrapeTeams}
                        onQueueOne={handleQueueOne}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({
  row,
  activeJobs,
}: {
  row: UnifiedRow;
  activeJobs: Map<string, { type: string; scraped?: number; total?: number }>;
}) {
  // RK9 active job display
  if (row.rk9) {
    const activeJob = activeJobs.get(row.rk9.event_id);
    if (activeJob) {
      if (
        activeJob.type === "teams" &&
        activeJob.total &&
        activeJob.total > 0
      ) {
        const pct = Math.round(
          ((activeJob.scraped ?? 0) / activeJob.total) * 100
        );
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Teams {activeJob.scraped}/{activeJob.total} ({pct}%)
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {activeJob.type === "roster"
            ? "Scraping roster..."
            : "Scraping teams..."}
        </Badge>
      );
    }
  }

  switch (row.status) {
    case "upcoming":
      return (
        <Badge variant="outline" className="text-xs text-blue-600">
          <Clock className="mr-1 h-3 w-3" />
          Upcoming
        </Badge>
      );
    case "complete":
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {row.source === "limitless" ? "Imported" : "Complete"}
        </Badge>
      );
    case "in-progress":
      if (row.limitless?.import_status === "queued") {
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
          >
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
      }
      if (row.limitless?.import_status === "importing") {
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400"
          >
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Importing
          </Badge>
        );
      }
      // RK9 in-progress states
      if (row.rk9?.import_status === "roster") {
        return (
          <Badge variant="secondary" className="text-xs">
            <Users className="mr-1 h-3 w-3" />
            Roster ready
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Teams partial
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
          {row.limitless?.import_attempts
            ? ` (${row.limitless.import_attempts}x)`
            : ""}
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
// Row Actions
// ---------------------------------------------------------------------------

function RowActions({
  row,
  activeJobs,
  queuingIds,
  batchQueuing,
  onScrapeRoster,
  onScrapeTeams,
  onQueueOne,
}: {
  row: UnifiedRow;
  activeJobs: Map<string, { type: string; scraped?: number; total?: number }>;
  queuingIds: Set<string>;
  batchQueuing: boolean;
  onScrapeRoster: (eventId: string) => void;
  onScrapeTeams: (eventId: string) => void;
  onQueueOne: (tournamentId: string) => void;
}) {
  if (row.source === "rk9" && row.rk9) {
    const event = row.rk9;
    const upcoming = isUpcoming(event.date_start);
    if (upcoming) return null;

    const activeJob = activeJobs.get(event.event_id);
    const isBusy = activeJob !== null && activeJob !== undefined;

    if (event.import_status === "complete" && event.has_team_lists) {
      return <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />;
    }

    if (event.import_status === "pending" || event.import_status === "failed") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScrapeRoster(event.event_id)}
          disabled={isBusy}
        >
          {activeJob?.type === "roster" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Roster
        </Button>
      );
    }

    if (
      event.import_status === "roster" ||
      event.import_status === "teams" ||
      (event.import_status === "complete" && !event.has_team_lists)
    ) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScrapeTeams(event.event_id)}
          disabled={isBusy}
        >
          {activeJob?.type === "teams" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Teams
        </Button>
      );
    }

    return null;
  }

  if (row.source === "limitless" && row.limitless) {
    const t = row.limitless;
    const isQueuing = queuingIds.has(t.tournament_id);

    if (!t.import_status || t.import_status === "failed") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQueueOne(t.tournament_id)}
          disabled={isQueuing || batchQueuing}
        >
          {isQueuing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      );
    }

    return null;
  }

  return null;
}
