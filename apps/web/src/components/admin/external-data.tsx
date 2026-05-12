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
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  triggerImportQueue,
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
  format_id: string | null;
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
  platform: string | null;
  is_online: boolean;
  decklists: boolean;
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
  // Filterable extras
  platform: string | null; // "SWITCH" | "SIM" (Limitless only)
  isOnline: boolean | null; // Limitless only
  hasData: boolean; // has_team_lists (RK9) or decklists (Limitless)
  country: string | null; // RK9 location_country
  // Source-specific extras
  rk9?: RK9EventRow;
  limitless?: LimitlessTournamentRow;
}

type PlatformFilter = "all" | "SWITCH" | "SIM";
type HasDataFilter = "all" | "yes" | "no";
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

// Per-tab filter state
interface RK9FilterState {
  search: string;
  tier: string;
  status: string;
  country: string;
  dateFrom: string;
  dateTo: string;
  minPlayers: string;
  hasData: HasDataFilter;
}

interface LimitlessFilterState {
  search: string;
  format: string;
  status: string;
  platform: PlatformFilter;
  dateFrom: string;
  dateTo: string;
  minPlayers: string;
  hasData: HasDataFilter;
}

const INITIAL_RK9_FILTERS: RK9FilterState = {
  search: "",
  tier: "all",
  status: "all",
  country: "all",
  dateFrom: "",
  dateTo: "",
  minPlayers: "",
  hasData: "all",
};

const INITIAL_LIMITLESS_FILTERS: LimitlessFilterState = {
  search: "",
  format: "all",
  status: "all",
  platform: "all",
  dateFrom: "",
  dateTo: "",
  minPlayers: "",
  hasData: "all",
};

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
  const [activeTab, setActiveTab] = useState<"rk9" | "limitless">("limitless");

  // Per-tab filter state
  const [rk9Filters, setRk9Filters] = useState<RK9FilterState>(INITIAL_RK9_FILTERS);
  const [rk9Sort, setRk9Sort] = useState<SortState>({ column: "date", direction: "desc" });
  const [limFilters, setLimFilters] = useState<LimitlessFilterState>(INITIAL_LIMITLESS_FILTERS);
  const [limSort, setLimSort] = useState<SortState>({ column: "date", direction: "desc" });

  // Auto-import state (per-source)
  const [rk9AutoImport, setRk9AutoImport] = useState(false);
  const [rk9AutoImportLoading, setRk9AutoImportLoading] = useState(true);
  const rk9AutoImportRef = useRef(false);

  const [limitlessAutoImport, setLimitlessAutoImport] = useState(false);
  const [limitlessAutoImportLoading, setLimitlessAutoImportLoading] = useState(true);
  const limitlessAutoImportRef = useRef(false);

  // Throughput config
  const [rk9TeamsPerTick, setRk9TeamsPerTick] = useState(100);
  const [rk9TeamsPerTickLoading, setRk9TeamsPerTickLoading] = useState(true);

  const [rk9TeamConcurrency, setRk9TeamConcurrency] = useState(3);
  const [rk9TeamConcurrencyLoading, setRk9TeamConcurrencyLoading] = useState(true);

  const [limitlessBatchSize, setLimitlessBatchSize] = useState(20);
  const [limitlessBatchSizeLoading, setLimitlessBatchSizeLoading] = useState(true);

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
  // Load auto-import settings from DB (per-source)
  // -------------------------------------------------------------------------

  useEffect(() => {
    getSiteConfig<boolean>("auto_import_rk9_enabled").then((result) => {
      if (result.success && result.data !== null) {
        setRk9AutoImport(result.data);
        rk9AutoImportRef.current = result.data;
      }
      setRk9AutoImportLoading(false);
    });

    getSiteConfig<boolean>("auto_import_limitless_enabled").then((result) => {
      if (result.success && result.data !== null) {
        setLimitlessAutoImport(result.data);
        limitlessAutoImportRef.current = result.data;
      }
      setLimitlessAutoImportLoading(false);
    });

    getSiteConfig<number>("rk9_max_teams_per_tick").then((result) => {
      if (result.success && result.data !== null) {
        setRk9TeamsPerTick(result.data);
      }
      setRk9TeamsPerTickLoading(false);
    });

    getSiteConfig<number>("limitless_batch_size").then((result) => {
      if (result.success && result.data !== null) {
        setLimitlessBatchSize(result.data);
      }
      setLimitlessBatchSizeLoading(false);
    });

    getSiteConfig<number>("rk9_team_concurrency").then((result) => {
      if (result.success && result.data !== null) {
        setRk9TeamConcurrency(result.data);
      }
      setRk9TeamConcurrencyLoading(false);
    });
  }, []);

  async function handleToggleRk9AutoImport(checked: boolean) {
    const previous = rk9AutoImport;
    setRk9AutoImport(checked);
    rk9AutoImportRef.current = checked;
    const result = await setSiteConfig("auto_import_rk9_enabled", checked);
    if (!result.success) {
      setRk9AutoImport(previous);
      rk9AutoImportRef.current = previous;
    }
  }

  async function handleToggleLimitlessAutoImport(checked: boolean) {
    const previous = limitlessAutoImport;
    setLimitlessAutoImport(checked);
    limitlessAutoImportRef.current = checked;
    const result = await setSiteConfig("auto_import_limitless_enabled", checked);
    if (!result.success) {
      setLimitlessAutoImport(previous);
      limitlessAutoImportRef.current = previous;
    }
  }

  async function handleRk9TeamsPerTickChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamsPerTick(num);
    await setSiteConfig("rk9_max_teams_per_tick", num);
  }

  async function handleRk9TeamConcurrencyChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamConcurrency(num);
    await setSiteConfig("rk9_team_concurrency", num);
  }

  async function handleLimitlessBatchSizeChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setLimitlessBatchSize(num);
    await setSiteConfig("limitless_batch_size", num);
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
          "event_id, name, tier, format_id, date_start, date_end, location_city, location_country, player_count, has_team_lists, import_status, import_error"
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
          "tournament_id, name, format_id, date, player_count, platform, is_online, decklists, data_imported_at, import_status, import_requested_at, import_error, import_attempts"
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
  // Build per-source rows + filter + sort
  // -------------------------------------------------------------------------

  // RK9 rows
  const rk9Rows: UnifiedRow[] = (rk9Events ?? []).map((e) => {
    const upcoming = isUpcoming(e.date_start);
    return {
      id: `rk9-${e.event_id}`,
      source: "rk9" as const,
      name: e.name,
      category: e.tier,
      date: e.date_start,
      playerCount: e.player_count,
      status: normalizeRk9Status(e.import_status, upcoming),
      statusDetail: upcoming ? "upcoming" : e.import_status,
      error: e.import_error,
      platform: null,
      isOnline: null,
      hasData: e.has_team_lists,
      country: e.location_country,
      rk9: e,
    };
  });

  const filteredRk9Rows = rk9Rows
    .filter((row) => {
      const f = rk9Filters;
      if (f.status !== "all" && row.status !== f.status) return false;
      if (f.tier !== "all" && row.category !== f.tier) return false;
      if (f.country !== "all" && row.country !== f.country) return false;
      if (f.dateFrom && row.date < f.dateFrom) return false;
      if (f.dateTo && row.date > f.dateTo) return false;
      if (f.minPlayers && row.playerCount !== null && row.playerCount < Number(f.minPlayers)) return false;
      if (f.hasData === "yes" && !row.hasData) return false;
      if (f.hasData === "no" && row.hasData) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!row.name.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q) && !row.category.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = rk9Sort;
      switch (column) {
        case "name": return compareValues(a.name, b.name, direction);
        case "category": return compareValues(a.category, b.category, direction);
        case "date": return compareValues(a.date, b.date, direction);
        case "playerCount": return compareValues(a.playerCount, b.playerCount, direction);
        case "status": return compareValues(a.status, b.status, direction);
        default: return 0;
      }
    });

  // Limitless rows
  const limitlessRows: UnifiedRow[] = (limitlessTournaments ?? []).map((t) => ({
    id: `limitless-${t.tournament_id}`,
    source: "limitless" as const,
    name: t.name,
    category: FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id,
    date: t.date,
    playerCount: t.player_count,
    status: normalizeLimitlessStatus(t.import_status),
    statusDetail: t.import_status ?? "pending",
    error: t.import_error,
    platform: t.platform,
    isOnline: t.is_online,
    hasData: t.decklists,
    country: null,
    limitless: t,
  }));

  const filteredLimitlessRows = limitlessRows
    .filter((row) => {
      const f = limFilters;
      if (f.status !== "all" && row.status !== f.status) return false;
      if (f.format !== "all" && row.category !== f.format) return false;
      if (f.platform !== "all" && row.platform !== f.platform) return false;
      if (f.dateFrom && row.date < f.dateFrom) return false;
      if (f.dateTo && row.date > f.dateTo) return false;
      if (f.minPlayers && row.playerCount !== null && row.playerCount < Number(f.minPlayers)) return false;
      if (f.hasData === "yes" && !row.hasData) return false;
      if (f.hasData === "no" && row.hasData) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!row.name.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q) && !row.category.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = limSort;
      switch (column) {
        case "name": return compareValues(a.name, b.name, direction);
        case "category": return compareValues(a.category, b.category, direction);
        case "date": return compareValues(a.date, b.date, direction);
        case "playerCount": return compareValues(a.playerCount, b.playerCount, direction);
        case "status": return compareValues(a.status, b.status, direction);
        case "queueOrder": {
          const aTime = a.limitless?.import_requested_at ?? "";
          const bTime = b.limitless?.import_requested_at ?? "";
          return compareValues(aTime, bTime, direction);
        }
        default: return 0;
      }
    });

  // Current tab's rows for the virtualizer
  const currentRows = activeTab === "rk9" ? filteredRk9Rows : filteredLimitlessRows;
  const totalRowCount = activeTab === "rk9" ? rk9Rows.length : limitlessRows.length;
  const currentSort = activeTab === "rk9" ? rk9Sort : limSort;
  const setCurrentSort = activeTab === "rk9"
    ? (s: SortState) => setRk9Sort(s)
    : (s: SortState) => setLimSort(s);

  // Derive unique filter options from data
  const rk9Tiers = [...new Set(rk9Rows.map((r) => r.category))].sort();
  const rk9Countries = [...new Set(rk9Rows.map((r) => r.country).filter(Boolean) as string[])].sort();
  const limitlessFormats = [...new Set(limitlessRows.map((r) => r.category))].sort();

  // Active filter counts
  const rk9ActiveFilterCount = (Object.keys(rk9Filters) as (keyof RK9FilterState)[]).filter(
    (key) => rk9Filters[key] !== INITIAL_RK9_FILTERS[key]
  ).length;
  const limActiveFilterCount = (Object.keys(limFilters) as (keyof LimitlessFilterState)[]).filter(
    (key) => limFilters[key] !== INITIAL_LIMITLESS_FILTERS[key]
  ).length;

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
    count: currentRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  useEffect(() => {
    if ((!rk9AutoImport && !limitlessAutoImport) || autoImportRunning.current) return;
    if (rk9Loading || limitlessLoading) return;

    // Find next RK9 item to process (only if RK9 auto-import is enabled)
    const nextRk9Pending = rk9AutoImport
      ? (rk9Events ?? []).find(
          (e) =>
            !isUpcoming(e.date_start) &&
            (e.import_status === "pending" || e.import_status === "failed") &&
            !activeJobs.has(e.event_id)
        )
      : undefined;

    const nextRk9Roster = rk9AutoImport
      ? (rk9Events ?? []).find(
          (e) =>
            !isUpcoming(e.date_start) &&
            (e.import_status === "roster" ||
              e.import_status === "teams" ||
              (e.import_status === "complete" && !e.has_team_lists)) &&
            !activeJobs.has(e.event_id)
        )
      : undefined;

    // Find next Limitless item to queue (only if Limitless auto-import is enabled)
    const nextLimitlessPending = limitlessAutoImport
      ? (limitlessTournaments ?? []).find(
          (t) =>
            (!t.import_status || t.import_status === "failed") &&
            !queuingIds.has(t.tournament_id)
        )
      : undefined;

    async function processNext() {
      autoImportRunning.current = true;
      try {
        const promises: Promise<void>[] = [];

        // Process RK9: finish in-progress events before starting new ones.
        // SYNC: This priority order is mirrored in the rk9-worker edge function
        // (packages/supabase/supabase/functions/rk9-worker/index.ts).
        // Update both locations when changing the processing order.
        if (nextRk9Roster && rk9AutoImportRef.current) {
          promises.push(handleScrapeTeams(nextRk9Roster.event_id));
        } else if (nextRk9Pending && rk9AutoImportRef.current) {
          promises.push(handleScrapeRoster(nextRk9Pending.event_id));
        }

        // Process Limitless: queue pending tournaments in batches
        if (nextLimitlessPending && limitlessAutoImportRef.current) {
          const pending = (limitlessTournaments ?? []).filter(
            (t) => !t.import_status || t.import_status === "failed"
          );
          if (pending.length > 0) {
            const ids = pending.slice(0, 100).map((t) => t.tournament_id);
            promises.push(
              batchQueueTournaments(ids).then(() => {
                setRefreshKey((k) => k + 1);
              })
            );
          }
        }

        // Process Limitless import queue if there are queued items
        if (
          limitlessAutoImportRef.current &&
          (limitlessQueuedCount > 0 || limitlessImportingCount > 0)
        ) {
          promises.push(
            triggerImportQueue(5).catch(() => {}) as Promise<void>
          );
        }

        await Promise.all(promises);
      } finally {
        autoImportRunning.current = false;
      }
    }

    processNext();
  }, [
    rk9AutoImport,
    limitlessAutoImport,
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
      {/* Header: Refresh */}
      <div className="flex items-center justify-end">
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

      {/* Error */}
      {queryError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {queryError.message}
        </div>
      )}

      {/* Sub-tabs: RK9 / Limitless */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rk9" | "limitless")}>
        <TabsList variant="line">
          <TabsTrigger value="rk9">
            RK9
            <Badge variant="secondary" className="ml-1.5 text-xs">{rk9Rows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="limitless">
            Limitless
            <Badge variant="secondary" className="ml-1.5 text-xs">{limitlessRows.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ----- RK9 Tab ----- */}
        <TabsContent value="rk9" className="space-y-4 pt-2">
          {/* RK9 Stats + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-sm font-medium">
                {rk9AutoImportLoading ? (
                  <Skeleton className="h-[18px] w-[32px] rounded-full" />
                ) : (
                  <Switch
                    checked={rk9AutoImport}
                    onCheckedChange={handleToggleRk9AutoImport}
                  />
                )}
                Auto-import
              </label>
              {rk9TeamsPerTickLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-6 w-14 px-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={rk9TeamsPerTick}
                    onChange={(e) => handleRk9TeamsPerTickChange(e.target.value)}
                    min={1}
                  />
                  <span className="text-muted-foreground text-xs">teams/tick</span>
                </div>
              )}
              {rk9TeamConcurrencyLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-6 w-11 px-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={rk9TeamConcurrency}
                    onChange={(e) => handleRk9TeamConcurrencyChange(e.target.value)}
                    min={1}
                    max={10}
                  />
                  <span className="text-muted-foreground text-xs">concurrent</span>
                </div>
              )}
              <div className="bg-border h-5 w-px" />
              <div className="flex items-center gap-1.5">
                <Globe className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-semibold">{rk9Total}</span>
                <span className="text-muted-foreground text-xs">events</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold">{rk9Imported}</span>
                <span className="text-muted-foreground text-xs">imported</span>
              </div>
              {rk9ActiveCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-purple-500/10 text-xs text-purple-700 dark:text-purple-400"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {rk9ActiveCount} processing
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
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
              <Button onClick={handleDiscover} disabled={isDiscovering} size="sm" variant="outline">
                {isDiscovering ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Discover
              </Button>
            </div>
          </div>

          {/* RK9 Filters */}
          <div className="bg-muted/30 space-y-2.5 rounded-lg border p-3">
            {/* Row 1: Search + primary filters */}
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-44 flex-1 space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Search</label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name or ID..."
                    value={rk9Filters.search}
                    onChange={(e) => setRk9Filters((p) => ({ ...p, search: e.target.value }))}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Tier</label>
                <Select value={rk9Filters.tier} onValueChange={(v) => v && setRk9Filters((p) => ({ ...p, tier: v }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {rk9Tiers.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Status</label>
                <Select value={rk9Filters.status} onValueChange={(v) => v && setRk9Filters((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Country</label>
                <Select value={rk9Filters.country} onValueChange={(v) => v && setRk9Filters((p) => ({ ...p, country: v }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {rk9Countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Row 2: Secondary filters */}
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Team Lists</label>
                <Select value={rk9Filters.hasData} onValueChange={(v) => v && setRk9Filters((p) => ({ ...p, hasData: v as HasDataFilter }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Has teams</SelectItem>
                    <SelectItem value="no">No teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Date Range</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={rk9Filters.dateFrom}
                    onChange={(e) => setRk9Filters((p) => ({ ...p, dateFrom: e.target.value }))}
                    className="h-7 w-32 text-xs"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="date"
                    value={rk9Filters.dateTo}
                    onChange={(e) => setRk9Filters((p) => ({ ...p, dateTo: e.target.value }))}
                    className="h-7 w-32 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Min Players</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={rk9Filters.minPlayers}
                  onChange={(e) => setRk9Filters((p) => ({ ...p, minPlayers: e.target.value }))}
                  className="h-7 w-20 text-xs"
                  min={0}
                />
              </div>
              {rk9ActiveFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRk9Filters(INITIAL_RK9_FILTERS)}
                  className="text-muted-foreground h-7 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  Clear ({rk9ActiveFilterCount})
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ----- Limitless Tab ----- */}
        <TabsContent value="limitless" className="space-y-4 pt-2">
          {/* Limitless Stats + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-sm font-medium">
                {limitlessAutoImportLoading ? (
                  <Skeleton className="h-[18px] w-[32px] rounded-full" />
                ) : (
                  <Switch
                    checked={limitlessAutoImport}
                    onCheckedChange={handleToggleLimitlessAutoImport}
                  />
                )}
                Auto-import
              </label>
              {limitlessBatchSizeLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-6 w-14 px-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={limitlessBatchSize}
                    onChange={(e) => handleLimitlessBatchSizeChange(e.target.value)}
                    min={1}
                  />
                  <span className="text-muted-foreground text-xs">tourneys/tick</span>
                </div>
              )}
              <div className="bg-border h-5 w-px" />
              {limitlessStatsLoading && !limitlessStats ? (
                <Skeleton className="h-5 w-32" />
              ) : limitlessStats ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Globe className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm font-semibold">{limitlessStats.totalSynced}</span>
                    <span className="text-muted-foreground text-xs">synced</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold">{limitlessStats.totalImported}</span>
                    <span className="text-muted-foreground text-xs">imported</span>
                  </div>
                </>
              ) : null}
              {limitlessQueuedCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {limitlessQueuedCount} queued
                </Badge>
              )}
              {limitlessImportingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {limitlessImportingCount} importing
                </Badge>
              )}
              {limitlessStatsError && (
                <p className="text-xs text-red-500">{limitlessStatsError.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
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
              {limitlessPendingCount > 0 && (
                <Button
                  onClick={handleQueueAll}
                  disabled={batchQueuing}
                  size="sm"
                  variant="outline"
                >
                  {batchQueuing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Queue All ({limitlessPendingCount})
                </Button>
              )}
              <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline">
                {syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Sync
              </Button>
            </div>
          </div>

          {/* Queue status strip */}
          {(limitlessQueuedCount > 0 || limitlessImportingCount > 0) && (
            <div className="bg-muted/30 flex items-center gap-4 rounded-lg border px-4 py-2 text-sm">
              {limitlessImportingCount > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {limitlessImportingCount} importing now
                </span>
              )}
              {limitlessQueuedCount > 0 && nextQueuedItem && (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Next up:
                  <span className="max-w-xs truncate font-medium">
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

          {/* Limitless Filters */}
          <div className="bg-muted/30 space-y-2.5 rounded-lg border p-3">
            {/* Row 1: Search + primary filters */}
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-44 flex-1 space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Search</label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name or ID..."
                    value={limFilters.search}
                    onChange={(e) => setLimFilters((p) => ({ ...p, search: e.target.value }))}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Format</label>
                <Select value={limFilters.format} onValueChange={(v) => v && setLimFilters((p) => ({ ...p, format: v }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {limitlessFormats.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Status</label>
                <Select value={limFilters.status} onValueChange={(v) => v && setLimFilters((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="importing">Importing</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Platform</label>
                <Select value={limFilters.platform} onValueChange={(v) => v && setLimFilters((p) => ({ ...p, platform: v as PlatformFilter }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="SWITCH">Switch</SelectItem>
                    <SelectItem value="SIM">Simulator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Row 2: Secondary filters */}
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Decklists</label>
                <Select value={limFilters.hasData} onValueChange={(v) => v && setLimFilters((p) => ({ ...p, hasData: v as HasDataFilter }))}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Has decklists</SelectItem>
                    <SelectItem value="no">No decklists</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Date Range</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={limFilters.dateFrom}
                    onChange={(e) => setLimFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                    className="h-7 w-32 text-xs"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="date"
                    value={limFilters.dateTo}
                    onChange={(e) => setLimFilters((p) => ({ ...p, dateTo: e.target.value }))}
                    className="h-7 w-32 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">Min Players</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={limFilters.minPlayers}
                  onChange={(e) => setLimFilters((p) => ({ ...p, minPlayers: e.target.value }))}
                  className="h-7 w-20 text-xs"
                  min={0}
                />
              </div>
              {limActiveFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLimFilters(INITIAL_LIMITLESS_FILTERS)}
                  className="text-muted-foreground h-7 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  Clear ({limActiveFilterCount})
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Shared Table */}
      {isLoading && !rk9Events && !limitlessTournaments ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : currentRows.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {totalRowCount === 0
            ? activeTab === "rk9"
              ? "No RK9 events found. Click Discover RK9 to import events."
              : "No Limitless tournaments found. Click Sync Limitless to import tournaments."
            : "No events match your filters."}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-xs">
            <ListFilter className="h-3.5 w-3.5" />
            Showing {currentRows.length} of {totalRowCount} events
          </div>

          {/* Fixed header row */}
          <div className="grid grid-cols-12 border-b">
            <SortableHeader
              column="name"
              label="Event"
              sort={currentSort}
              onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
              className={activeTab === "limitless" ? "col-span-3" : "col-span-4"}
            />
            <SortableHeader
              column="category"
              label="Type"
              sort={currentSort}
              onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
              className="col-span-2"
            />
            <SortableHeader
              column="date"
              label="Date"
              sort={currentSort}
              onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
              className="col-span-2"
            />
            <SortableHeader
              column="playerCount"
              label="Players"
              sort={currentSort}
              onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
              className="col-span-1"
            />
            <SortableHeader
              column="status"
              label="Status"
              sort={currentSort}
              onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
              className="col-span-2"
            />
            {activeTab === "limitless" && (
              <SortableHeader
                column="queueOrder"
                label="Queue"
                sort={currentSort}
                onSort={(c) => setCurrentSort(toggleSort(currentSort, c))}
                className="col-span-1"
              />
            )}
            <div className="col-span-1 flex h-10 items-center justify-end px-2 font-medium whitespace-nowrap">
              Actions
            </div>
          </div>

          {/* Virtualized body */}
          <div key={activeTab} ref={scrollRef} className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = currentRows[virtualRow.index];
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
                      "grid grid-cols-12 border-b transition-colors hover:bg-muted/50",
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
                    <div className={cn("min-w-0 p-2", activeTab === "limitless" ? "col-span-3" : "col-span-4")}>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {row.name}
                        </a>
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {row.rk9?.location_city && (
                        <p className="text-muted-foreground truncate text-xs">
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
                        <p className="mt-0.5 truncate text-xs text-red-500">{row.error}</p>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center p-2">
                      <Badge variant="secondary" className="truncate text-xs capitalize">
                        {row.category}
                      </Badge>
                    </div>
                    <div className="col-span-2 flex items-center p-2 text-sm whitespace-nowrap">
                      {row.date}
                    </div>
                    <div className="col-span-1 flex items-center p-2 text-sm whitespace-nowrap">
                      {row.playerCount ?? "—"}
                    </div>
                    <div className="col-span-2 flex items-center p-2">
                      <StatusBadge row={row} activeJobs={activeJobs} />
                    </div>
                    {activeTab === "limitless" && (
                      <div className="col-span-1 flex items-center p-2">
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
                    )}
                    <div className="col-span-1 flex items-center justify-end p-2">
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
