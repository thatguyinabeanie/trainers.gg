"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  ListFilter,
  Loader2,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { LIMITLESS_TO_FORMAT } from "@/lib/limitless";
import {
  discoverRk9Events,
  scrapeRk9Roster,
  scrapeRk9TeamsBatch,
  resetRk9EventData,
} from "@/actions/rk9";
import {
  queueTournamentForImport,
  batchQueueTournaments,
  triggerLimitlessSync,
  triggerImportQueue,
} from "@/actions/limitless";
import { triggerUsageRollup, calculateAllSourceUsage } from "@/actions/usage";
import { getSiteConfig, setSiteConfig } from "@/actions/site-config";
import { formatTimeAgo, getErrorMessage } from "@trainers/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/use-is-client";

import { normalizeLimitlessStatus } from "./limitless-status";
import {
  type RK9EventRow,
  type LimitlessTournamentRow,
  type UnifiedRow,
  type ImportFilterState,
  INITIAL_IMPORT_FILTERS,
  queueableIds,
  rosterEligibleIds,
  teamsEligibleIds,
} from "./external-data-shared";
import { deriveDisplayStatus } from "./display-status";
import { StatusTabs, type StatusTab } from "./external-data-status-tabs";
import { type StatusChip } from "./external-data-status-chips";
import { ExternalDataToolbar } from "./external-data-toolbar";
import { SelectionBar } from "./external-data-selection-bar";
import { EventList } from "./external-data-cards";
import { ExpandedRowData } from "./expanded-row-data";
import { PlayerExpandedData } from "./player-expanded-data";
import { QueueStrip } from "./external-data-queue-strip";
import { ExternalDataFilters } from "./external-data-filters";

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

// Sentinel for render-time tab-change reset (avoids useEffect for derived state)
const UNINITIALIZED = Symbol();

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
// (moved to ./limitless-status.ts so it can be unit tested in isolation)

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
    <div
      className={cn(
        "flex h-10 items-center px-2 font-medium whitespace-nowrap",
        className
      )}
    >
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExternalData() {
  const isMobile = useIsMobile();
  const isClient = useIsClient();

  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = useSearchParams();

  // Expanded row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    done: number;
    current: string;
  } | null>(null);

  // Render-time source-change reset — collapses any open row when switching source
  const [prevSource, setPrevSource] = useState<
    ImportFilterState["source"] | symbol
  >(UNINITIALIZED);

  // Unified filter + sort state
  const [filters, setFilters] = useState<ImportFilterState>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "rk9" || tabParam === "limitless") {
      return { ...INITIAL_IMPORT_FILTERS, source: tabParam };
    }
    return INITIAL_IMPORT_FILTERS;
  });
  const [sort, setSort] = useState<SortState>({
    column: "date",
    direction: "desc",
  });

  // Reset row expansion + selection on source change (render-time, no effect)
  if (filters.source !== prevSource) {
    setPrevSource(filters.source);
    setExpandedRowId(null);
    setSelectedIds(new Set());
  }

  // Auto-import state (backend = pg_cron)
  const [rk9BackendAutoImport, setRk9BackendAutoImport] = useState(false);
  const [limitlessBackendAutoImport, setLimitlessBackendAutoImport] =
    useState(false);

  // Throughput config
  const [rk9TeamsPerTick, setRk9TeamsPerTick] = useState(100);
  const [rk9TeamConcurrency, setRk9TeamConcurrency] = useState(3);
  const [rk9CronInterval, setRk9CronInterval] = useState(60);
  const [limitlessCronInterval, setLimitlessCronInterval] = useState(300);
  const [limitlessBatchSize, setLimitlessBatchSize] = useState(20);

  // Committed (last successfully saved) values for config inputs
  const rk9TeamsPerTickCommitted = useRef(rk9TeamsPerTick);
  const rk9TeamConcurrencyCommitted = useRef(rk9TeamConcurrency);
  const rk9CronIntervalCommitted = useRef(rk9CronInterval);
  const limitlessCronIntervalCommitted = useRef(limitlessCronInterval);
  const limitlessBatchSizeCommitted = useRef(limitlessBatchSize);

  // Single loading flag for all site config fields — set false once all 7 resolve
  const [configLoading, setConfigLoading] = useState(true);

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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Usage rollup state
  const [recomputingUsage, setRecomputingUsage] = useState(false);

  // Global cross-source usage calculation state
  const [calculatingUsage, setCalculatingUsage] = useState(false);

  // Last time usage was calculated/recomputed successfully (ISO string)
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load auto-import settings from DB (per-source)
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const [
          rk9Auto,
          limAuto,
          teamsPerTick,
          batchSize,
          concurrency,
          rk9Cron,
          limCron,
        ] = await Promise.all([
          getSiteConfig<boolean>("rk9_backend_auto_import"),
          getSiteConfig<boolean>("limitless_backend_auto_import"),
          getSiteConfig<number>("rk9_max_teams_per_tick"),
          getSiteConfig<number>("limitless_batch_size"),
          getSiteConfig<number>("rk9_team_concurrency"),
          getSiteConfig<number>("rk9_cron_interval_seconds"),
          getSiteConfig<number>("limitless_cron_interval_seconds"),
        ]);
        if (cancelled) return;
        if (rk9Auto.success && rk9Auto.data !== null)
          setRk9BackendAutoImport(rk9Auto.data);
        if (limAuto.success && limAuto.data !== null)
          setLimitlessBackendAutoImport(limAuto.data);
        if (teamsPerTick.success && teamsPerTick.data !== null)
          setRk9TeamsPerTick(teamsPerTick.data);
        if (batchSize.success && batchSize.data !== null)
          setLimitlessBatchSize(batchSize.data);
        if (concurrency.success && concurrency.data !== null)
          setRk9TeamConcurrency(concurrency.data);
        if (rk9Cron.success && rk9Cron.data !== null)
          setRk9CronInterval(rk9Cron.data);
        if (limCron.success && limCron.data !== null)
          setLimitlessCronInterval(limCron.data);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleRk9Backend(checked: boolean) {
    const previous = rk9BackendAutoImport;
    setRk9BackendAutoImport(checked);
    const result = await setSiteConfig("rk9_backend_auto_import", checked);
    if (!result.success) {
      setRk9BackendAutoImport(previous);
      toast.error("Failed to update RK9 backend setting");
      return;
    }
    // Only reset timer when the save succeeded and we're enabling
    if (checked) {
      await setSiteConfig("rk9_last_run_at", null);
    }
  }

  async function handleToggleLimitlessBackend(checked: boolean) {
    const previous = limitlessBackendAutoImport;
    setLimitlessBackendAutoImport(checked);
    const result = await setSiteConfig(
      "limitless_backend_auto_import",
      checked
    );
    if (!result.success) {
      setLimitlessBackendAutoImport(previous);
      toast.error("Failed to update Limitless backend setting");
      return;
    }
    // Only reset timer when the save succeeded and we're enabling
    if (checked) {
      await setSiteConfig("limitless_last_run_at", null);
    }
  }

  function handleRk9TeamsPerTickChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamsPerTick(num);
  }

  async function saveRk9TeamsPerTick() {
    const current = rk9TeamsPerTick;
    const previous = rk9TeamsPerTickCommitted.current;
    const result = await setSiteConfig("rk9_max_teams_per_tick", current);
    if (!result.success) {
      setRk9TeamsPerTick(previous);
      toast.error("Failed to save setting");
    } else {
      rk9TeamsPerTickCommitted.current = current;
    }
  }

  function handleRk9TeamConcurrencyChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9TeamConcurrency(num);
  }

  async function saveRk9TeamConcurrency() {
    const current = rk9TeamConcurrency;
    const previous = rk9TeamConcurrencyCommitted.current;
    const result = await setSiteConfig("rk9_team_concurrency", current);
    if (!result.success) {
      setRk9TeamConcurrency(previous);
      toast.error("Failed to save setting");
    } else {
      rk9TeamConcurrencyCommitted.current = current;
    }
  }

  function handleRk9CronIntervalChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setRk9CronInterval(num);
  }

  async function saveRk9CronInterval() {
    const current = rk9CronInterval;
    const previous = rk9CronIntervalCommitted.current;
    const result = await setSiteConfig("rk9_cron_interval_seconds", current);
    if (!result.success) {
      setRk9CronInterval(previous);
      toast.error("Failed to save setting");
    } else {
      rk9CronIntervalCommitted.current = current;
    }
  }

  function handleLimitlessCronIntervalChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setLimitlessCronInterval(num);
  }

  async function saveLimitlessCronInterval() {
    const current = limitlessCronInterval;
    const previous = limitlessCronIntervalCommitted.current;
    const result = await setSiteConfig(
      "limitless_cron_interval_seconds",
      current
    );
    if (!result.success) {
      setLimitlessCronInterval(previous);
      toast.error("Failed to save setting");
    } else {
      limitlessCronIntervalCommitted.current = current;
    }
  }

  function handleLimitlessBatchSizeChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setLimitlessBatchSize(num);
  }

  async function saveLimitlessBatchSize() {
    const current = limitlessBatchSize;
    const previous = limitlessBatchSizeCommitted.current;
    const result = await setSiteConfig("limitless_batch_size", current);
    if (!result.success) {
      setLimitlessBatchSize(previous);
      toast.error("Failed to save setting");
    } else {
      limitlessBatchSizeCommitted.current = current;
    }
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
          "event_id, name, tier, format_id, date_start, date_end, location_city, location_country, player_count, has_team_lists, import_status, import_error, teams_imported_count"
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
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    FORMAT_ID_TO_CODE[fmtId] = code;
  }

  // Derived stats from already-fetched tournament list
  const totalSynced = (limitlessTournaments ?? []).length;
  const totalImported = (limitlessTournaments ?? []).filter(
    (t) => t.data_imported_at !== null
  ).length;

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

  // RK9 rows — two-pass: build the full shape first, then derive displayStatus
  // (deriveDisplayStatus needs the complete UnifiedRow, including rk9/limitless)
  const rk9Rows: UnifiedRow[] = (rk9Events ?? [])
    .map((e) => {
      const upcoming = isUpcoming(e.date_start);
      // Derive a regulation label from format_id (same lookup Limitless uses),
      // falling back to tier so rows without a format_id still show something.
      const rk9Category =
        (e.format_id != null ? FORMAT_ID_TO_CODE[e.format_id] : undefined) ??
        e.tier;
      return {
        id: `rk9-${e.event_id}`,
        source: "rk9" as const,
        name: e.name,
        category: rk9Category,
        date: e.date_start,
        playerCount: e.player_count,
        status: normalizeRk9Status(e.import_status, upcoming),
        statusDetail: upcoming ? "upcoming" : e.import_status,
        displayStatus: "pending" as const,
        error: e.import_error,
        platform: null,
        isOnline: null,
        hasData: e.has_team_lists,
        country: e.location_country,
        rk9: e,
      };
    })
    .map((row) => ({ ...row, displayStatus: deriveDisplayStatus(row) }));

  // Limitless rows — two-pass: build the full shape first, then derive displayStatus
  const limitlessRows: UnifiedRow[] = (limitlessTournaments ?? [])
    .map((t) => ({
      id: `limitless-${t.tournament_id}`,
      source: "limitless" as const,
      name: t.name,
      category: FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id,
      date: t.date,
      playerCount: t.player_count,
      status: normalizeLimitlessStatus(t.import_status),
      statusDetail: t.import_status ?? "pending",
      displayStatus: "pending" as const,
      error: t.import_error,
      platform: t.platform,
      isOnline: t.is_online,
      hasData: t.decklists,
      country: null,
      limitless: t,
    }))
    .map((row) => ({ ...row, displayStatus: deriveDisplayStatus(row) }));

  // All rows from both sources
  const allRows: UnifiedRow[] = [...rk9Rows, ...limitlessRows];

  // Source-filtered rows (before status/other filters) — used for counts
  const sourceRows =
    filters.source === "all"
      ? allRows
      : allRows.filter((r) => r.source === filters.source);

  // Unified filtered + sorted rows
  const filteredRows = allRows
    .filter((row) => {
      const f = filters;
      // Source filter
      if (f.source !== "all" && row.source !== f.source) return false;
      // Status filter (unified display status)
      if (f.status !== "all" && row.displayStatus !== f.status) return false;
      // Format filter (regulation code for both sources)
      if (f.format !== "all" && row.category !== f.format) return false;
      // Platform — only applies to Limitless rows
      if (
        f.platform !== "all" &&
        row.source === "limitless" &&
        row.platform !== f.platform
      )
        return false;
      // Country — only applies to RK9 rows
      if (
        f.country !== "all" &&
        row.source === "rk9" &&
        row.country !== f.country
      )
        return false;
      // Data available
      if (f.hasData === "yes" && !row.hasData) return false;
      if (f.hasData === "no" && row.hasData) return false;
      // Date range
      if (f.dateFrom && row.date < f.dateFrom) return false;
      if (f.dateTo && row.date > f.dateTo) return false;
      // Min players
      if (
        f.minPlayers &&
        row.playerCount !== null &&
        row.playerCount < Number(f.minPlayers)
      )
        return false;
      // Search
      if (f.search) {
        const q = f.search.toLowerCase();
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
        case "source":
          return compareValues(a.source, b.source, direction);
        case "name":
          return compareValues(a.name, b.name, direction);
        case "category":
          return compareValues(a.category, b.category, direction);
        case "date":
          return compareValues(a.date, b.date, direction);
        case "playerCount":
          return compareValues(a.playerCount, b.playerCount, direction);
        case "status":
          return compareValues(a.status, b.status, direction);
        default:
          return 0;
      }
    });

  // Alias for the virtualizer
  const currentRows = filteredRows;
  const totalRowCount = sourceRows.length;

  // Bulk action eligibility — operate on full unfiltered rows so selection
  // counts are always accurate regardless of active filters
  const selectedRk9Rows = rk9Rows.filter((r) => selectedIds.has(r.id));
  const rosterEligibleSelected = selectedRk9Rows.filter(
    (r) =>
      r.rk9!.import_status === "pending" || r.rk9!.import_status === "failed"
  );
  const teamsEligibleSelected = selectedRk9Rows.filter((r) =>
    ["roster", "teams", "complete"].includes(r.rk9!.import_status)
  );
  const resetEligibleSelected = selectedRk9Rows.filter(
    (r) => r.rk9!.import_status !== "pending"
  );
  const limitlessQueueEligibleSelected = limitlessRows.filter(
    (r) =>
      selectedIds.has(r.id) &&
      (!r.limitless!.import_status || r.limitless!.import_status === "failed")
  );

  // Derive unique filter options from ALL rows (both sources)
  const allCountries = [
    ...new Set(rk9Rows.map((r) => r.country).filter(Boolean) as string[]),
  ].sort();
  const allFormats = [
    ...new Set(allRows.map((r) => r.category).filter(Boolean)),
  ].sort();

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

  // ---------------------------------------------------------------------------
  // Filter-aware bulk targets (toolbar "Queue/Scrape Matching" buttons)
  // Use the currently filtered+source-scoped rows so counts stay coherent.
  // ---------------------------------------------------------------------------
  const rk9FilteredRows = filteredRows.filter((r) => r.source === "rk9");
  const limitlessFilteredRows = filteredRows.filter(
    (r) => r.source === "limitless"
  );
  const limitlessQueueMatchingIds = queueableIds(limitlessFilteredRows);
  const rk9RosterMatchingIds = rosterEligibleIds(rk9FilteredRows);
  const rk9TeamsMatchingIds = teamsEligibleIds(rk9FilteredRows);

  // Status chip arrays
  const limitlessFailedCount = (limitlessTournaments ?? []).filter(
    (t) => t.import_status === "failed"
  ).length;

  // Per-display-status counts for unified status tabs — over source-scoped rows
  const sourceStatusCounts = sourceRows.reduce(
    (acc, r) => {
      acc[r.displayStatus] = (acc[r.displayStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Limitless-specific counts for chips + skipped banner
  const limitlessStatusCounts = limitlessRows.reduce(
    (acc, r) => {
      acc[r.displayStatus] = (acc[r.displayStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const limitlessSkippedCount = limitlessStatusCounts["skipped"] ?? 0;

  // Skipped breakdown by raw format code (for the explainer banner).
  const limitlessSkippedByFormat = limitlessRows
    .filter((r) => r.displayStatus === "skipped")
    .reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const limitlessChips: StatusChip[] = [
    { label: "synced", count: totalSynced, tone: "synced" },
    { label: "queued", count: limitlessQueuedCount, tone: "queued" },
    { label: "importing", count: limitlessImportingCount, tone: "importing" },
    { label: "imported", count: totalImported, tone: "imported" },
    { label: "failed", count: limitlessFailedCount, tone: "failed" },
    { label: "skipped", count: limitlessSkippedCount, tone: "skipped" },
  ];
  const rk9FailedCount =
    rk9Events?.filter((e) => e.import_status === "failed").length ?? 0;
  const rk9Chips: StatusChip[] = [
    { label: "events", count: rk9Total, tone: "synced" },
    { label: "imported", count: rk9Imported, tone: "imported" },
    { label: "failed", count: rk9FailedCount, tone: "failed" },
  ];
  const allChips: StatusChip[] = [
    { label: "rk9 events", count: rk9Total, tone: "synced" as const },
    { label: "lim synced", count: totalSynced, tone: "synced" as const },
    {
      label: "imported",
      count: rk9Imported + totalImported,
      tone: "imported" as const,
    },
    {
      label: "failed",
      count: rk9FailedCount + limitlessFailedCount,
      tone: "failed" as const,
    },
  ];
  const activeChips =
    filters.source === "rk9"
      ? rk9Chips
      : filters.source === "limitless"
        ? limitlessChips
        : allChips;

  const nextQueuedItem =
    (limitlessTournaments ?? [])
      .filter((t) => t.import_status === "queued" && t.import_requested_at)
      .sort(
        (a, b) =>
          new Date(a.import_requested_at!).getTime() -
          new Date(b.import_requested_at!).getTime()
      )[0] ?? null;

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

  async function handleScrapeTeams(eventId: string, force?: boolean) {
    setActiveJobs((prev) =>
      new Map(prev).set(eventId, { type: "teams", scraped: 0, total: 0 })
    );
    try {
      let done = false;
      let lastScraped = -1;
      let noProgressRounds = 0;
      while (!done) {
        const result = await scrapeRk9TeamsBatch(eventId, { force });
        if (!result.success) break;
        done = result.done ?? false;
        const scraped = result.scraped ?? 0;
        // Detect infinite loop: if scraped count hasn't changed after 3 batches, stop.
        if (scraped === lastScraped) {
          noProgressRounds++;
          if (noProgressRounds >= 3) break;
        } else {
          noProgressRounds = 0;
          lastScraped = scraped;
        }
        setActiveJobs((prev) =>
          new Map(prev).set(eventId, {
            type: "teams",
            scraped,
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

  async function handleResetEvent(eventId: string) {
    if (
      !window.confirm(
        "Delete all roster and team data for this event? Cannot be undone."
      )
    )
      return;
    const result = await resetRk9EventData(eventId);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Event reset");
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

  async function handleRunImport() {
    setImporting(true);
    setImportMessage(null);
    // Snapshot total queued at start; we'll update as we learn more
    const snapshotTotal = limitlessQueuedCount;
    let done = 0;
    let noProgressRounds = 0;
    try {
      while (true) {
        const result = await triggerImportQueue(limitlessBatchSize);
        if (!result.success) {
          toast.error(result.error ?? "Import failed");
          break;
        }
        const { processed, errors: _errors, remaining } = result.data;
        done += processed;
        setImportProgress({
          done,
          total: Math.max(snapshotTotal, done + remaining),
        });
        if (remaining === 0) break;
        // No-progress guard: stop after 3 consecutive batches with 0 processed
        if (processed === 0) {
          noProgressRounds++;
          if (noProgressRounds >= 3) break;
        } else {
          noProgressRounds = 0;
        }
      }
      setImportMessage(`Imported ${done}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setImportMessage(
        `Error: ${err instanceof Error ? err.message : "Import failed"}`
      );
    } finally {
      setImportProgress(null);
      setImporting(false);
    }
  }

  async function handleRecomputeUsage() {
    setRecomputingUsage(true);
    try {
      const result = await triggerUsageRollup({ force: true });
      if (!result.success) throw new Error(result.error);
      const { ran, formatsProcessed, bucketsWritten } = result.data;
      if (ran) {
        toast.success(
          `Recomputed ${formatsProcessed} format(s) · ${bucketsWritten} bucket(s)`
        );
        setLastCalculatedAt(new Date().toISOString());
      } else {
        toast.success("No dirty formats — skipped");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Recompute failed"));
    } finally {
      setRecomputingUsage(false);
    }
  }

  async function handleCalculateUsage() {
    setCalculatingUsage(true);
    try {
      const result = await calculateAllSourceUsage();
      if (!result.success) throw new Error(result.error);
      const { eventsComputed, formatsProcessed, bucketsWritten } = result.data;
      if (eventsComputed === 0) {
        toast.success("No new events");
      } else {
        toast.success(
          `Computed ${eventsComputed} event(s) · ${formatsProcessed} format(s) · ${bucketsWritten} bucket(s)`
        );
      }
      setLastCalculatedAt(new Date().toISOString());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Calculation failed"));
    } finally {
      setCalculatingUsage(false);
    }
  }

  async function handleQueueOne(tournamentId: string) {
    setQueuingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await queueTournamentForImport(tournamentId);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue tournament"));
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
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue tournaments"));
    } finally {
      setBatchQueuing(false);
    }
  }

  /** Queue only the tournaments matching the active filters (pending/failed). */
  async function handleQueueMatching() {
    if (limitlessQueueMatchingIds.length === 0) return;
    setBatchQueuing(true);
    try {
      const result = await batchQueueTournaments(limitlessQueueMatchingIds);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue tournaments"));
    } finally {
      setBatchQueuing(false);
    }
  }

  /** Scrape rosters for all RK9 events matching the active filters. */
  async function handleScrapeRostersMatching() {
    if (rk9RosterMatchingIds.length === 0) return;
    setBulkProcessing(true);
    for (let i = 0; i < rk9RosterMatchingIds.length; i++) {
      const id = rk9RosterMatchingIds[i]!;
      const name = rk9Events?.find((e) => e.event_id === id)?.name ?? id;
      setBulkProgress({
        total: rk9RosterMatchingIds.length,
        done: i,
        current: name,
      });
      await handleScrapeRoster(id);
    }
    setBulkProcessing(false);
    setBulkProgress(null);
  }

  /** Scrape teams for all RK9 events matching the active filters. */
  async function handleScrapeTeamsMatching() {
    if (rk9TeamsMatchingIds.length === 0) return;
    setBulkProcessing(true);
    for (let i = 0; i < rk9TeamsMatchingIds.length; i++) {
      const id = rk9TeamsMatchingIds[i]!;
      const name = rk9Events?.find((e) => e.event_id === id)?.name ?? id;
      setBulkProgress({
        total: rk9TeamsMatchingIds.length,
        done: i,
        current: name,
      });
      await handleScrapeTeams(id);
    }
    setBulkProcessing(false);
    setBulkProgress(null);
  }

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------

  async function handleBulkScrapeRosters() {
    setBulkProcessing(true);
    const events = rosterEligibleSelected;
    for (let i = 0; i < events.length; i++) {
      const row = events[i]!;
      setBulkProgress({ total: events.length, done: i, current: row.name });
      await handleScrapeRoster(row.rk9!.event_id);
    }
    setBulkProcessing(false);
    setBulkProgress(null);
    setSelectedIds(new Set());
  }

  async function handleBulkScrapeTeams() {
    setBulkProcessing(true);
    const events = teamsEligibleSelected;
    for (let i = 0; i < events.length; i++) {
      const row = events[i]!;
      setBulkProgress({ total: events.length, done: i, current: row.name });
      await handleScrapeTeams(row.rk9!.event_id);
    }
    setBulkProcessing(false);
    setBulkProgress(null);
    setSelectedIds(new Set());
  }

  async function handleBulkResetEvents() {
    if (
      !window.confirm(
        `Delete roster and team data for ${resetEligibleSelected.length} event(s)? This cannot be undone.`
      )
    )
      return;
    setBulkProcessing(true);
    const events = resetEligibleSelected;
    for (let i = 0; i < events.length; i++) {
      setBulkProgress({
        total: events.length,
        done: i,
        current: events[i]!.name,
      });
      await resetRk9EventData(events[i]!.rk9!.event_id);
    }
    setBulkProcessing(false);
    setBulkProgress(null);
    setSelectedIds(new Set());
    setRefreshKey((k) => k + 1);
  }

  async function handleBulkQueueSelected() {
    setBulkProcessing(true);
    const ids = limitlessQueueEligibleSelected.map(
      (r) => r.limitless!.tournament_id
    );
    const result = await batchQueueTournaments(ids);
    if (!result.success)
      toast.error(result.error ?? "Failed to queue tournaments");
    setSelectedIds(new Set());
    setRefreshKey((k) => k + 1);
    setBulkProcessing(false);
  }

  // -------------------------------------------------------------------------
  // Auto-import loop
  // When enabled, process one pending item at a time from each source.
  // -------------------------------------------------------------------------

  // RK9 sub-view: events or players
  const [rk9View, setRk9View] = useState<"events" | "players">("events");

  // Player search
  const [playerSearch, setPlayerSearch] = useState("");

  // RK9 players query — always called (Rules of Hooks), but skips fetch when not on players view
  const { data: rk9Players, isLoading: rk9PlayersLoading } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      if (rk9View !== "players") return [];
      const { data, error } = await sb
        .schema("rk9")
        .from("players")
        .select(
          "id, player_id_masked, first_name, last_name, country, standings(count)"
        )
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: number;
        player_id_masked: string | null;
        first_name: string;
        last_name: string;
        country: string;
        standings: [{ count: number }];
      }>;
    },
    [refreshKey, rk9View === "players" ? "load" : "skip"]
  );

  // Client-side player filter
  const filteredPlayers = (rk9Players ?? []).filter((p) => {
    if (!playerSearch) return true;
    const q = playerSearch.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.player_id_masked?.toLowerCase().includes(q)
    );
  });

  // Expanded player row state
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const playerScrollRef = useRef<HTMLDivElement>(null);

  type PlayerSortCol = "name" | "id" | "country" | "events";
  const [playerSort, setPlayerSort] = useState<{
    column: PlayerSortCol;
    direction: "asc" | "desc";
  }>({ column: "name", direction: "asc" });

  function togglePlayerSort(col: PlayerSortCol) {
    setPlayerSort((prev) =>
      prev.column === col
        ? { column: col, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: col, direction: "asc" }
    );
  }

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const dir = playerSort.direction === "asc" ? 1 : -1;
    switch (playerSort.column) {
      case "name":
        return (
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          ) * dir
        );
      case "id":
        return (
          (a.player_id_masked ?? "").localeCompare(b.player_id_masked ?? "") *
          dir
        );
      case "country":
        return (a.country ?? "").localeCompare(b.country ?? "") * dir;
      case "events":
        return (
          ((a.standings[0]?.count ?? 0) - (b.standings[0]?.count ?? 0)) * dir
        );
      default:
        return 0;
    }
  });

  const rowVirtualizer = useVirtualizer({
    count: currentRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const playerVirtualizer = useVirtualizer({
    count: sortedPlayers.length,
    getScrollElement: () => playerScrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  // Unified status tabs — counts over source-scoped rows.
  // Skipped tab only shown when viewing Limitless or All (RK9 has no skipped concept).
  const showSkippedTab = filters.source !== "rk9" && limitlessSkippedCount > 0;
  const statusTabs: StatusTab[] = [
    { value: "all", label: "All", count: sourceRows.length },
    {
      value: "pending",
      label: "Pending",
      count: sourceStatusCounts["pending"] ?? 0,
    },
    {
      value: "in-progress",
      label: "In progress",
      count: sourceStatusCounts["in-progress"] ?? 0,
    },
    {
      value: "imported",
      label: "Imported",
      count: sourceStatusCounts["imported"] ?? 0,
    },
    {
      value: "failed",
      label: "Failed",
      count: sourceStatusCounts["failed"] ?? 0,
    },
    ...(showSkippedTab
      ? [
          {
            value: "skipped",
            label: "Skipped",
            count: limitlessSkippedCount,
            tone: "skipped" as const,
          },
        ]
      : []),
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isLoading = rk9Loading || limitlessLoading;
  const isFetching = rk9Fetching || limitlessFetching;
  const queryError = rk9Error || limitlessError;

  return (
    <div className="space-y-6">
      {/* Error */}
      {queryError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {queryError.message}
        </div>
      )}

      {/* Global queue / activity strip */}
      <QueueStrip
        tab={filters.source === "rk9" ? "rk9" : "limitless"}
        queuedCount={limitlessQueuedCount}
        nextLabel={nextQueuedItem?.name ?? null}
        nextQueuedAgo={
          nextQueuedItem?.import_requested_at
            ? formatTimeAgo(nextQueuedItem.import_requested_at)
            : null
        }
        importProgress={importProgress}
        draining={importing}
        onRunImport={handleRunImport}
        rk9Jobs={[...activeJobs.entries()].map(([eventId, j]) => ({
          name: rk9Events?.find((e) => e.event_id === eventId)?.name ?? eventId,
          scraped: j.scraped,
          total: j.total,
        }))}
      />

      <div className="space-y-4">
        {/* RK9 sub-nav — only shown when source is "rk9" */}
        {filters.source === "rk9" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setRk9View("events");
                setSelectedIds(new Set());
              }}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                rk9View === "events"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Events
            </button>
            <button
              onClick={() => {
                setRk9View("players");
                setSelectedIds(new Set());
              }}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                rk9View === "players"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Players
            </button>
          </div>
        )}

        {/* Players search input — only in RK9 players view */}
        {filters.source === "rk9" && rk9View === "players" ? (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search by name or player ID..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        ) : (
          <>
            {/* Single toolbar — shows source-contextual actions */}
            <ExternalDataToolbar
              tab={filters.source === "limitless" ? "limitless" : "rk9"}
              chips={activeChips}
              settings={
                filters.source === "limitless"
                  ? {
                      tab: "limitless",
                      loading: configLoading,
                      backendOn: limitlessBackendAutoImport,
                      onToggleBackend: handleToggleLimitlessBackend,
                      batchSize: limitlessBatchSize,
                      onBatchSizeChange: handleLimitlessBatchSizeChange,
                      onBatchSizeBlur: saveLimitlessBatchSize,
                      intervalSeconds: limitlessCronInterval,
                      onIntervalChange: handleLimitlessCronIntervalChange,
                      onIntervalBlur: saveLimitlessCronInterval,
                    }
                  : {
                      tab: "rk9",
                      loading: configLoading,
                      backendOn: rk9BackendAutoImport,
                      onToggleBackend: handleToggleRk9Backend,
                      teamsPerTick: rk9TeamsPerTick,
                      onTeamsPerTickChange: handleRk9TeamsPerTickChange,
                      onTeamsPerTickBlur: saveRk9TeamsPerTick,
                      concurrency: rk9TeamConcurrency,
                      onConcurrencyChange: handleRk9TeamConcurrencyChange,
                      onConcurrencyBlur: saveRk9TeamConcurrency,
                      intervalSeconds: rk9CronInterval,
                      onIntervalChange: handleRk9CronIntervalChange,
                      onIntervalBlur: saveRk9CronInterval,
                    }
              }
              isFetching={isFetching}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              onRecomputeUsage={handleRecomputeUsage}
              recomputingUsage={recomputingUsage}
              onCalculateUsage={handleCalculateUsage}
              calculatingUsage={calculatingUsage}
              lastCalculatedAt={lastCalculatedAt}
              // RK9 actions — shown when source is rk9 or all
              onDiscover={
                filters.source !== "limitless" ? handleDiscover : undefined
              }
              isDiscovering={isDiscovering}
              onScrapeRostersMatching={
                filters.source !== "limitless"
                  ? handleScrapeRostersMatching
                  : undefined
              }
              rosterMatchingCount={rk9RosterMatchingIds.length}
              onScrapeTeamsMatching={
                filters.source !== "limitless"
                  ? handleScrapeTeamsMatching
                  : undefined
              }
              teamsMatchingCount={rk9TeamsMatchingIds.length}
              // Limitless actions — shown when source is limitless or all
              onSync={filters.source !== "rk9" ? handleSync : undefined}
              syncing={syncing}
              onQueueMatching={
                filters.source !== "rk9" ? handleQueueMatching : undefined
              }
              queueMatchingCount={limitlessQueueMatchingIds.length}
              onQueueAll={filters.source !== "rk9" ? handleQueueAll : undefined}
              queueAllCount={limitlessPendingCount}
              bulkProcessing={bulkProcessing}
            />
            {/* Per-action feedback messages */}
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
            {importMessage && (
              <p
                className={cn(
                  "text-xs",
                  importMessage.startsWith("Error")
                    ? "text-red-500"
                    : "text-muted-foreground"
                )}
              >
                {importMessage}
              </p>
            )}

            {/* Unified status tabs */}
            <StatusTabs
              tabs={statusTabs}
              active={filters.status}
              onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
            />

            {/* Skipped breakdown banner — visible when skipped tab active */}
            {filters.status === "skipped" && limitlessSkippedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <span aria-hidden>⊘</span>
                <span className="font-semibold">
                  {limitlessSkippedCount.toLocaleString()} events skipped
                </span>
                <span>— their format isn&apos;t supported for import:</span>
                {Object.entries(limitlessSkippedByFormat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, n]) => (
                    <span
                      key={code}
                      className="rounded-full bg-amber-200/60 px-2 py-px font-medium dark:bg-amber-900/40"
                    >
                      {code} ×{n.toLocaleString()}
                    </span>
                  ))}
              </div>
            )}

            {/* Unified filters */}
            <ExternalDataFilters
              filters={filters}
              onChange={(patch) => setFilters((p) => ({ ...p, ...patch }))}
              onClear={() => setFilters(INITIAL_IMPORT_FILTERS)}
              countryOptions={allCountries}
              formatOptions={allFormats}
              resultCount={filteredRows.length}
              totalCount={sourceRows.length}
            />
          </>
        )}
      </div>

      {/* Bulk action bar — shown when rows are selected */}
      <SelectionBar
        tab={filters.source === "limitless" ? "limitless" : "rk9"}
        selectedCount={selectedIds.size}
        bulkProcessing={bulkProcessing}
        onClear={() => setSelectedIds(new Set())}
        rosterEligibleCount={rosterEligibleSelected.length}
        teamsEligibleCount={teamsEligibleSelected.length}
        resetEligibleCount={resetEligibleSelected.length}
        onScrapeRosters={handleBulkScrapeRosters}
        onScrapeTeams={handleBulkScrapeTeams}
        onResetEvents={handleBulkResetEvents}
        queueEligibleCount={limitlessQueueEligibleSelected.length}
        onQueueSelected={handleBulkQueueSelected}
      />
      {bulkProcessing && bulkProgress && (
        <span className="text-muted-foreground text-xs">
          {bulkProgress.done}/{bulkProgress.total} — {bulkProgress.current}
        </span>
      )}

      {/* Players Table — only shown when source=rk9 + players view */}
      {filters.source === "rk9" && rk9View === "players" && (
        <div className="rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-xs">
            <ListFilter className="h-3.5 w-3.5" />
            {rk9PlayersLoading
              ? "Loading players…"
              : `Showing ${filteredPlayers.length} players`}
          </div>

          {/* Players table header */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: "28px 1fr 120px 60px 60px" }}
          >
            <div className="h-10" />
            {(["name", "id", "country", "events"] as const).map((col) => (
              <div key={col} className="flex h-10 items-center px-2">
                <button
                  className="hover:text-foreground inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap capitalize"
                  onClick={() => togglePlayerSort(col)}
                >
                  {col === "id"
                    ? "RK9 ID"
                    : col.charAt(0).toUpperCase() + col.slice(1)}
                  {playerSort.column === col ? (
                    playerSort.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {rk9PlayersLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {(rk9Players ?? []).length === 0
                ? "No players found."
                : "No players match your search."}
            </div>
          ) : (
            /* Virtualized body */
            <div
              ref={playerScrollRef}
              className="overflow-auto"
              style={{ maxHeight: "calc(100vh - 300px)" }}
            >
              <div
                style={{
                  height: playerVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {playerVirtualizer.getVirtualItems().map((virtualRow) => {
                  const p = sortedPlayers[virtualRow.index];
                  if (!p) return null;
                  const isPlayerExpanded = expandedPlayerId === p.id;
                  const eventCount = p.standings[0]?.count ?? 0;
                  return (
                    <div
                      key={p.id}
                      ref={playerVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="border-b"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        className="hover:bg-muted/50 grid transition-colors"
                        style={{
                          gridTemplateColumns: "28px 1fr 120px 60px 60px",
                        }}
                      >
                        {/* Chevron */}
                        <div className="flex items-center justify-center py-3">
                          <button
                            className="hover:bg-muted flex h-5 w-5 items-center justify-center rounded"
                            onClick={() =>
                              setExpandedPlayerId(
                                isPlayerExpanded ? null : p.id
                              )
                            }
                            aria-label={
                              isPlayerExpanded ? "Collapse" : "Expand"
                            }
                          >
                            {isPlayerExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {/* Name */}
                        <div className="flex min-w-0 items-center px-3 py-3 text-xs">
                          <span className="truncate">
                            {[p.first_name, p.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </span>
                        </div>
                        {/* Player ID */}
                        <div className="text-muted-foreground flex items-center px-3 py-3 font-mono text-xs">
                          {p.player_id_masked ?? "—"}
                        </div>
                        {/* Country */}
                        <div className="flex items-center px-3 py-3 font-mono text-xs uppercase">
                          {p.country ?? "—"}
                        </div>
                        {/* Events */}
                        <div className="flex items-center px-3 py-3 text-xs">
                          {eventCount}
                        </div>
                      </div>
                      {isPlayerExpanded && (
                        <PlayerExpandedData playerId={p.id} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared Events Table — hidden when source=rk9 and players view active */}
      {(filters.source !== "rk9" || rk9View === "events") && (
        <>
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
                ? filters.source === "rk9"
                  ? "No RK9 events found. Click Discover RK9 to import events."
                  : filters.source === "limitless"
                    ? "No Limitless tournaments found. Click Sync Limitless to import tournaments."
                    : "No events found. Click Discover or Sync to import events."
                : "No events match your filters."}
            </div>
          ) : (
            <div className={cn("rounded-md", !isMobile && "border")}>
              {/* Results note + table header are desktop-only — on mobile the
              filter bar already shows the count and the cards replace the table. */}
              {!isMobile && (
                <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-xs">
                  <ListFilter className="h-3.5 w-3.5" />
                  Showing {currentRows.length} of {totalRowCount} events
                </div>
              )}

              {/* Fixed header row — unified columns: checkbox · chevron · Source · Event · Format · Date · Players · Status · Actions */}
              {!isMobile && (
                <div
                  className="grid border-b"
                  style={{
                    gridTemplateColumns:
                      "32px 28px 80px minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) 90px minmax(0,1.5fr) 100px",
                  }}
                >
                  <div className="flex h-10 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        currentRows.length > 0 &&
                        selectedIds.size === currentRows.length
                      }
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            selectedIds.size > 0 &&
                            selectedIds.size < currentRows.length;
                      }}
                      onChange={(e) => {
                        setSelectedIds(
                          e.target.checked
                            ? new Set(currentRows.map((r) => r.id))
                            : new Set()
                        );
                      }}
                      className="h-4 w-4 cursor-pointer rounded border"
                      aria-label="Select all visible"
                    />
                  </div>
                  {/* Chevron column header — empty */}
                  <div className="h-10" />
                  {/* Source column */}
                  <SortableHeader
                    column="source"
                    label="Source"
                    sort={sort}
                    onSort={(c) => setSort(toggleSort(sort, c))}
                  />
                  <SortableHeader
                    column="name"
                    label="Event"
                    sort={sort}
                    onSort={(c) => setSort(toggleSort(sort, c))}
                  />
                  <SortableHeader
                    column="category"
                    label="Format"
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
                  <div className="flex h-10 items-center justify-end pr-2 text-xs font-medium whitespace-nowrap">
                    Actions
                  </div>
                </div>
              )}

              {/* Virtualized body — conditional mount: skeleton (SSR) / cards (mobile) / table (desktop) */}
              {!isClient ? (
                /* CLS-safe skeleton: height derived from row count so the layout
               doesn't jump when the real table mounts. Dynamic px is justified
               here — the Tailwind scale has no per-row granularity. */
                <div
                  aria-hidden
                  className="bg-muted/30 animate-pulse rounded-b-md"
                  style={{
                    height: `${Math.max(currentRows.length, 3) * 56 + 32}px`,
                  }}
                />
              ) : isMobile ? (
                <div className="p-3">
                  <EventList
                    rows={currentRows}
                    expandedRowId={expandedRowId}
                    onToggleExpand={(id) =>
                      setExpandedRowId((prev) => (prev === id ? null : id))
                    }
                    renderActions={(row) => (
                      <RowActions
                        row={row}
                        activeJobs={activeJobs}
                        queuingIds={queuingIds}
                        batchQueuing={batchQueuing}
                        isUpcomingRow={row.status === "upcoming"}
                        onScrapeRoster={handleScrapeRoster}
                        onScrapeTeams={handleScrapeTeams}
                        onQueueOne={handleQueueOne}
                        onResetEvent={handleResetEvent}
                      />
                    )}
                  />
                </div>
              ) : (
                <div
                  key={filters.source}
                  ref={scrollRef}
                  className="overflow-auto"
                  style={{ maxHeight: "calc(100vh - 300px)" }}
                >
                  <div
                    style={{
                      height: rowVirtualizer.getTotalSize(),
                      position: "relative",
                    }}
                  >
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
                              {
                                label: "Roster",
                                href: `https://rk9.gg/roster/${row.rk9!.event_id}`,
                              },
                              {
                                label: "Pairings",
                                href: `https://rk9.gg/pairings/${row.rk9!.event_id}`,
                              },
                              {
                                label: "Standings",
                                href: `https://rk9.gg/standings/${row.rk9!.event_id}`,
                              },
                            ]
                          : row.source === "limitless"
                            ? [
                                {
                                  label: "Standings",
                                  href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/standings`,
                                },
                                {
                                  label: "Pairings",
                                  href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/pairings`,
                                },
                                {
                                  label: "Players",
                                  href: `https://play.limitlesstcg.com/tournament/${row.limitless!.tournament_id}/players`,
                                },
                              ]
                            : [];
                      const isExpandable =
                        row.source === "rk9"
                          ? ["roster", "teams", "complete"].includes(
                              row.rk9!.import_status
                            )
                          : row.limitless!.data_imported_at !== null;
                      return (
                        <div
                          key={row.id}
                          ref={rowVirtualizer.measureElement}
                          data-index={virtualRow.index}
                          className="border-b"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <div
                            className={cn(
                              "hover:bg-muted/50 grid transition-colors",
                              isUpcomingRow && "opacity-60"
                            )}
                            style={{
                              gridTemplateColumns:
                                "32px 28px 80px minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) 90px minmax(0,1.5fr) 100px",
                            }}
                          >
                            {/* Checkbox */}
                            <div className="flex items-center justify-center py-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.id)}
                                onChange={(e) => {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) {
                                      next.add(row.id);
                                    } else {
                                      next.delete(row.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 cursor-pointer rounded border"
                                aria-label={`Select ${row.name}`}
                              />
                            </div>
                            {/* Chevron */}
                            <div className="flex items-center justify-center py-2">
                              {isExpandable && (
                                <button
                                  className="hover:bg-muted flex h-5 w-5 items-center justify-center rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRowId(
                                      expandedRowId === row.id ? null : row.id
                                    );
                                  }}
                                  aria-label={
                                    expandedRowId === row.id
                                      ? "Collapse"
                                      : "Expand"
                                  }
                                >
                                  {expandedRowId === row.id ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            {/* Source */}
                            <div className="flex items-center py-2">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold",
                                  row.source === "rk9"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                )}
                              >
                                {row.source === "rk9" ? "RK9" : "Limitless"}
                              </span>
                            </div>
                            {/* Event name */}
                            <div className="min-w-0 p-2">
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
                                  {row.rk9.location_country
                                    ? `, ${row.rk9.location_country}`
                                    : ""}
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
                                <p className="mt-0.5 truncate text-xs text-red-500">
                                  {row.error}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center p-2">
                              <Badge
                                variant="secondary"
                                className="truncate text-xs capitalize"
                              >
                                {row.category}
                              </Badge>
                            </div>
                            <div className="flex items-center p-2 text-sm whitespace-nowrap">
                              {row.date}
                            </div>
                            <div className="flex items-center p-2 text-sm whitespace-nowrap">
                              {row.playerCount ?? "—"}
                            </div>
                            <div className="flex flex-col items-start gap-0.5 p-2">
                              <StatusBadge row={row} activeJobs={activeJobs} />
                              {row.source === "rk9" &&
                                (row.rk9!.import_status === "teams" ||
                                  row.rk9!.import_status === "complete") &&
                                row.rk9!.player_count != null && (
                                  <span className="text-muted-foreground text-xs">
                                    {row.rk9!.teams_imported_count ?? 0}/
                                    {row.rk9!.player_count} teams
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-1 p-2">
                              <RowActions
                                row={row}
                                activeJobs={activeJobs}
                                queuingIds={queuingIds}
                                batchQueuing={batchQueuing}
                                isUpcomingRow={isUpcomingRow}
                                onScrapeRoster={handleScrapeRoster}
                                onScrapeTeams={handleScrapeTeams}
                                onQueueOne={handleQueueOne}
                                onResetEvent={handleResetEvent}
                              />
                            </div>
                          </div>
                          {expandedRowId === row.id && (
                            <ExpandedRowData row={row} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
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

  // Limitless rows whose format can't be imported (e.g. CUSTOM) — surfaced as a
  // distinct "Skipped" status rather than the default "Pending". Keyed off the
  // derived displayStatus so it matches the Skipped tab/chip.
  if (row.displayStatus === "skipped") {
    return (
      <Badge
        variant="outline"
        className="text-xs text-slate-600 dark:text-slate-400"
      >
        <span className="mr-1" aria-hidden>
          ⊘
        </span>
        Skipped
      </Badge>
    );
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
  isUpcomingRow,
  onScrapeRoster,
  onScrapeTeams,
  onQueueOne,
  onResetEvent,
}: {
  row: UnifiedRow;
  activeJobs: Map<string, { type: string; scraped?: number; total?: number }>;
  queuingIds: Set<string>;
  batchQueuing: boolean;
  isUpcomingRow: boolean;
  onScrapeRoster: (eventId: string) => void;
  onScrapeTeams: (eventId: string, force?: boolean) => void;
  onQueueOne: (tournamentId: string) => void;
  onResetEvent: (eventId: string) => void;
}) {
  if (row.source === "rk9" && row.rk9) {
    const event = row.rk9;
    if (isUpcomingRow) return null;

    const activeJob = activeJobs.get(event.event_id);
    const isBusy = activeJob !== null && activeJob !== undefined;

    const resetButton =
      event.import_status !== "pending" ? (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onResetEvent(event.event_id)}
          title="Reset roster and team data"
          aria-label="Reset event"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null;

    if (event.import_status === "complete" && event.has_team_lists) {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {resetButton}
        </div>
      );
    }

    if (event.import_status === "pending" || event.import_status === "failed") {
      return (
        <div className="flex items-center gap-1.5">
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
          {resetButton}
        </div>
      );
    }

    if (
      event.import_status === "roster" ||
      event.import_status === "teams" ||
      (event.import_status === "complete" && !event.has_team_lists)
    ) {
      return (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onScrapeTeams(event.event_id, event.import_status === "complete")
            }
            disabled={isBusy}
          >
            {activeJob?.type === "teams" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Teams
          </Button>
          {resetButton}
        </div>
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
