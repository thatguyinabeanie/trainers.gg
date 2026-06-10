"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListFilter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { LIMITLESS_TO_FORMAT } from "@/lib/limitless";
import {
  discoverRk9Events,
  resetRk9EventData,
  queueRk9Event,
  batchQueueRk9Events,
  unqueueRk9Events,
  resetStuckRk9Events,
} from "@/actions/rk9";
import {
  importLimitlessTournament,
  batchQueueTournaments,
  triggerLimitlessSync,
  unqueueLimitlessTournaments,
  resetStuckLimitlessImports,
} from "@/actions/limitless";
import { processImportQueuesNow } from "@/actions/import-queue";
import { calculateAllSourceUsage } from "@/actions/usage";
import { getErrorMessage } from "@trainers/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/use-is-client";

import { normalizeLimitlessStatus } from "./limitless-status";
import {
  type RK9EventRow,
  type LimitlessTournamentRow,
  type UnifiedRow,
  type ImportFilterState,
  INITIAL_IMPORT_FILTERS,
} from "./external-data-shared";
import { deriveDisplayStatus } from "./display-status";
import { StatusTabs, type StatusTab } from "./external-data-status-tabs";
import { type StatusChip } from "./external-data-status-chips";
import { ExternalDataToolbar } from "./external-data-toolbar";
import { SelectionBar } from "./external-data-selection-bar";
import { EventList } from "./external-data-cards";
import { ExpandedRowData } from "./expanded-row-data";
import { QueueStrip } from "./external-data-queue-strip";
import { ExternalDataFilters } from "./external-data-filters";
import { StatusBadge } from "./external-data-status-badge";
import { RowActions } from "./external-data-row-actions";
import {
  SortableHeader,
  toggleSort,
  compareValues,
  type SortState,
} from "./external-data-table-helpers";
import { PlayersView } from "./external-data-players-view";
import { useImportConfig } from "./use-import-config";

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
    case "queued":
      return "queued";
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

  // Per-source site config (auto-import toggles, throughput/cron/batch inputs)
  const {
    configLoading,
    rk9BackendAutoImport,
    limitlessBackendAutoImport,
    rk9TeamsPerTick,
    rk9TeamConcurrency,
    rk9CronInterval,
    limitlessCronInterval,
    limitlessBatchSize,
    handleToggleRk9Backend,
    handleToggleLimitlessBackend,
    handleRk9TeamsPerTickChange,
    saveRk9TeamsPerTick,
    handleRk9TeamConcurrencyChange,
    saveRk9TeamConcurrency,
    handleRk9CronIntervalChange,
    saveRk9CronInterval,
    handleLimitlessCronIntervalChange,
    saveLimitlessCronInterval,
    handleLimitlessBatchSizeChange,
    saveLimitlessBatchSize,
  } = useImportConfig();

  // RK9 state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  // Limitless state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [queuingIds, setQueuingIds] = useState<Set<string>>(new Set());
  const [batchQueuing, setBatchQueuing] = useState(false);

  // "Process now" — fires processImportQueuesNow (server-side drain trigger)
  const [processing, setProcessing] = useState(false);

  // Global cross-source usage calculation state
  const [calculatingUsage, setCalculatingUsage] = useState(false);

  // Last time usage was calculated/recomputed successfully (ISO string)
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);

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
      // Paginate in 1000-row pages — hosted Supabase caps responses at
      // max-rows=1000, so a single select silently truncates large tables.
      const PAGE = 1000;
      const all: RK9EventRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb
          .schema("rk9")
          .from("events")
          .select(
            "event_id, name, tier, format_id, date_start, date_end, location_city, location_country, player_count, has_team_lists, import_status, import_error, teams_imported_count, import_attempts, import_requested_at, imported_at"
          )
          .order("date_start", { ascending: false })
          .order("event_id", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data ?? []) as RK9EventRow[];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }
      return all;
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
      // Paginate in 1000-row pages — hosted Supabase caps responses at
      // max-rows=1000, so a single select silently truncates (only ~1000 of
      // several thousand synced tournaments would load otherwise).
      const PAGE = 1000;
      const all: LimitlessTournamentRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb
          .schema("limitless")
          .from("tournaments")
          .select(
            "tournament_id, name, format_id, date, player_count, platform, is_online, decklists, data_imported_at, import_status, import_requested_at, import_error, import_attempts"
          )
          .order("date", { ascending: false })
          .order("tournament_id", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data ?? []) as LimitlessTournamentRow[];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }
      return all;
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

  // RK9 queue counts for the strip and polling trigger
  const rk9QueuedCount = (rk9Events ?? []).filter(
    (e) => e.import_status === "queued"
  ).length;
  const rk9InProgressCount = (rk9Events ?? []).filter(
    (e) => e.import_status === "roster" || e.import_status === "teams"
  ).length;

  const hasActiveQueue =
    limitlessQueuedCount > 0 ||
    limitlessImportingCount > 0 ||
    rk9QueuedCount > 0 ||
    rk9InProgressCount > 0;

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
  const resetEligibleSelected = selectedRk9Rows.filter(
    (r) => r.rk9!.import_status !== "pending"
  );
  const limitlessQueueEligibleSelected = limitlessRows.filter(
    (r) =>
      selectedIds.has(r.id) &&
      (!r.limitless!.import_status || r.limitless!.import_status === "failed")
  );

  // Unified import-eligible selected count: RK9 pending/failed/roster/teams +
  // Limitless pending/failed. Excludes upcoming RK9 rows.
  const importEligibleSelectedCount =
    selectedRk9Rows.filter(
      (r) =>
        r.status !== "upcoming" &&
        (r.rk9!.import_status === "pending" ||
          r.rk9!.import_status === "failed" ||
          r.rk9!.import_status === "roster" ||
          r.rk9!.import_status === "teams")
    ).length + limitlessQueueEligibleSelected.length;

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

  // Importable predicate: rows that can be advanced in the import pipeline.
  // Excludes upcoming (status==="upcoming") since they have no roster yet.
  function isImportableRow(r: UnifiedRow): boolean {
    return (
      r.status !== "upcoming" &&
      (r.displayStatus === "pending" ||
        r.displayStatus === "failed" ||
        (r.source === "rk9" && r.displayStatus === "in-progress"))
    );
  }

  const importMatchingCount = filteredRows.filter(isImportableRow).length;
  const importAllCount = allRows.filter(isImportableRow).length;

  // Rows imported within the last 10 minutes — shown in QueueStrip activity.
  // Limitless: data_imported_at within 10 min. RK9: import_requested_at within
  // 10 min AND import_status === "complete" (best proxy; no dedicated timestamp).
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentImported =
    (limitlessTournaments ?? []).filter((t) => {
      if (!t.data_imported_at) return false;
      return new Date(t.data_imported_at) >= tenMinAgo;
    }).length +
    (rk9Events ?? []).filter((e) => {
      if (!e.imported_at) return false;
      return new Date(e.imported_at) >= tenMinAgo;
    }).length;

  // Count selected rows that are currently queued (eligible for unqueue).
  const unqueueEligibleCount =
    limitlessRows.filter(
      (r) => selectedIds.has(r.id) && r.limitless!.import_status === "queued"
    ).length +
    rk9Rows.filter(
      (r) => selectedIds.has(r.id) && r.rk9!.import_status === "queued"
    ).length;

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

  /**
   * Fires the server-side import worker immediately (one cron-cycle's worth).
   * Replaces the old browser-driven drain loop — no more polling/progress bars.
   */
  async function handleProcessNow() {
    setProcessing(true);
    try {
      const result = await processImportQueuesNow();
      if (!result.success) {
        toast.error(result.error ?? "Process failed");
        return;
      }
      const { limitless, rk9 } = result.data;
      const total =
        limitless.processed +
        rk9.eventsTouched +
        rk9.teamsScraped +
        limitless.errors +
        rk9.errors;
      if (total === 0) {
        toast.success("No pending items to process");
      } else {
        toast.success(
          `Processed — Limitless: ${limitless.processed} imported, RK9: ${rk9.teamsScraped} teams scraped`
        );
      }
      setRefreshKey((k) => k + 1);
    } finally {
      setProcessing(false);
    }
  }

  /**
   * Returns ALL queued rows (both sources) to "pending" status.
   * Backed by an AlertDialog confirm in QueueStrip — this is the confirmed path.
   * Passes no ids to each action so the server clears all queued rows in one shot.
   */
  async function handleUnqueueAll() {
    const [lResult, rResult] = await Promise.all([
      unqueueLimitlessTournaments(),
      unqueueRk9Events(),
    ]);

    // Refresh unconditionally — one source may have unqueued successfully
    // even when the other errored, and the rows must reflect that.
    setRefreshKey((k) => k + 1);

    const errors = [
      ...(lResult.success ? [] : [lResult.error ?? "Limitless unqueue failed"]),
      ...(rResult.success ? [] : [rResult.error ?? "RK9 unqueue failed"]),
    ];
    if (errors.length > 0) {
      toast.error(errors.join(" · "));
      return;
    }
    const total =
      (lResult.success ? lResult.data.unqueued : 0) +
      (rResult.success ? rResult.data.unqueued : 0);
    toast.success(
      total > 0
        ? `Returned ${total} queued item(s) to pending`
        : "No queued items to unqueue"
    );
  }

  /**
   * Returns SELECTED queued rows (both sources) to "pending" status.
   * Only rows with import_status === "queued" are acted on.
   */
  async function handleUnqueueSelected() {
    const limitlessIds = limitlessRows
      .filter(
        (r) => selectedIds.has(r.id) && r.limitless!.import_status === "queued"
      )
      .map((r) => r.limitless!.tournament_id);
    const rk9Ids = rk9Rows
      .filter((r) => selectedIds.has(r.id) && r.rk9!.import_status === "queued")
      .map((r) => r.rk9!.event_id);

    if (limitlessIds.length === 0 && rk9Ids.length === 0) {
      toast.success("No queued items selected");
      return;
    }

    const [lResult, rResult] = await Promise.all([
      limitlessIds.length > 0
        ? unqueueLimitlessTournaments(limitlessIds)
        : Promise.resolve({
            success: true as const,
            data: { unqueued: 0 },
          }),
      rk9Ids.length > 0
        ? unqueueRk9Events(rk9Ids)
        : Promise.resolve({
            success: true as const,
            data: { unqueued: 0 },
          }),
    ]);

    // Refresh + clear selection unconditionally — one source may have
    // unqueued successfully even when the other errored (mirrors handleUnqueueAll).
    setSelectedIds(new Set());
    setRefreshKey((k) => k + 1);

    const errors = [
      ...(lResult.success ? [] : [lResult.error ?? "Limitless unqueue failed"]),
      ...(rResult.success ? [] : [rResult.error ?? "RK9 unqueue failed"]),
    ];
    if (errors.length > 0) {
      toast.error(errors.join(" · "));
      return;
    }
    const total =
      (lResult.success ? lResult.data.unqueued : 0) +
      (rResult.success ? rResult.data.unqueued : 0);
    toast.success(
      total > 0
        ? `Returned ${total} queued item(s) to pending`
        : "Nothing to unqueue"
    );
  }

  /**
   * Resets stuck importing/roster/teams rows back to "pending" for both sources.
   */
  async function handleResetStuck() {
    const [lResult, rResult] = await Promise.all([
      resetStuckLimitlessImports(),
      resetStuckRk9Events(),
    ]);

    // Refresh unconditionally — one source may have reset successfully
    // even when the other errored (mirrors handleUnqueueAll).
    setRefreshKey((k) => k + 1);

    const errors = [
      ...(lResult.success ? [] : [lResult.error ?? "Limitless reset failed"]),
      ...(rResult.success ? [] : [rResult.error ?? "RK9 reset failed"]),
    ];
    if (errors.length > 0) {
      toast.error(errors.join(" · "));
      return;
    }
    const total =
      (lResult.success ? lResult.data.reset : 0) +
      (rResult.success ? rResult.data.reset : 0);
    toast.success(
      total > 0 ? `Reset ${total} stuck item(s)` : "No stuck items found"
    );
  }

  async function handleCalculateUsage() {
    setCalculatingUsage(true);
    try {
      const result = await calculateAllSourceUsage();
      if (!result.success) throw new Error(result.error);
      const { eventsComputed, formatsProcessed } = result.data;
      if (eventsComputed === 0) {
        toast.success("No new events");
      } else {
        toast.success(
          `Compiled ${eventsComputed} event(s) across ${formatsProcessed} format(s)`
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

  /**
   * One-pass per-row import for a single Limitless tournament.
   * Calls importLimitlessTournament directly (full fetch+insert, not enqueue).
   * Uses queuingIds for spinner feedback while in flight.
   */
  async function handleImportLimitlessOne(tournamentId: string) {
    setQueuingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await importLimitlessTournament(tournamentId);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to import tournament"));
    } finally {
      setQueuingIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  /**
   * Per-row import dispatcher.
   * - Limitless: full fetch+insert via importLimitlessTournament
   * - RK9: queues event for server-side pickup via queueRk9Event
   *
   * Rows with displayStatus "queued" are not eligible (they're already queued).
   */
  async function handleImport(row: UnifiedRow) {
    if (row.source === "limitless") {
      await handleImportLimitlessOne(row.limitless!.tournament_id);
      return;
    }
    // RK9: queue for server-side processing
    setQueuingIds((prev) => new Set(prev).add(row.rk9!.event_id));
    try {
      const result = await queueRk9Event(row.rk9!.event_id);
      if (!result.success) throw new Error(result.error);
      toast.success(
        result.data.queued > 0
          ? "Queued — imports run in the background"
          : "Already queued or not eligible"
      );
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue event"));
    } finally {
      setQueuingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.rk9!.event_id);
        return next;
      });
    }
  }

  /**
   * Import all eligible rows across both sources (ignores active filters).
   * Queued rows are excluded (already in queue). RK9 uses batchQueueRk9Events.
   */
  async function handleImportAll() {
    const importableRows = allRows.filter(
      (r) =>
        r.status !== "upcoming" &&
        r.displayStatus !== "queued" &&
        (r.displayStatus === "pending" ||
          r.displayStatus === "failed" ||
          (r.source === "rk9" && r.displayStatus === "in-progress"))
    );
    if (importableRows.length === 0) return;

    const limitlessIds = importableRows
      .filter((r) => r.source === "limitless")
      .map((r) => r.limitless!.tournament_id);

    const rk9ImportIds = importableRows
      .filter((r) => r.source === "rk9")
      .map((r) => r.rk9!.event_id);

    setBatchQueuing(true);
    try {
      const [lResult, rResult] = await Promise.all([
        limitlessIds.length > 0
          ? batchQueueTournaments(limitlessIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
        rk9ImportIds.length > 0
          ? batchQueueRk9Events(rk9ImportIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
      ]);
      if (!lResult.success) throw new Error(lResult.error);
      if (!rResult.success) throw new Error(rResult.error);
      const total = lResult.data.queued + rResult.data.queued;
      toast.success(
        total > 0
          ? `Queued ${total} — imports run in the background. Use Process now to start immediately.`
          : "No new items to queue"
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue events"));
    } finally {
      setBatchQueuing(false);
    }
    setRefreshKey((k) => k + 1);
  }

  /**
   * Import eligible rows matching the active filters.
   * Same batching strategy as handleImportAll but scoped to filteredRows.
   * Queued rows are excluded.
   */
  async function handleImportMatching() {
    const importableRows = filteredRows.filter(
      (r) =>
        r.status !== "upcoming" &&
        r.displayStatus !== "queued" &&
        (r.displayStatus === "pending" ||
          r.displayStatus === "failed" ||
          (r.source === "rk9" && r.displayStatus === "in-progress"))
    );
    if (importableRows.length === 0) return;

    const limitlessIds = importableRows
      .filter((r) => r.source === "limitless")
      .map((r) => r.limitless!.tournament_id);

    const rk9ImportIds = importableRows
      .filter((r) => r.source === "rk9")
      .map((r) => r.rk9!.event_id);

    setBatchQueuing(true);
    try {
      const [lResult, rResult] = await Promise.all([
        limitlessIds.length > 0
          ? batchQueueTournaments(limitlessIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
        rk9ImportIds.length > 0
          ? batchQueueRk9Events(rk9ImportIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
      ]);
      if (!lResult.success) throw new Error(lResult.error);
      if (!rResult.success) throw new Error(rResult.error);
      const total = lResult.data.queued + rResult.data.queued;
      toast.success(
        total > 0
          ? `Queued ${total} — imports run in the background. Use Process now to start immediately.`
          : "No new items to queue"
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue events"));
    } finally {
      setBatchQueuing(false);
    }
    setRefreshKey((k) => k + 1);
  }

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------

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

  /**
   * Queue selected rows that are eligible (pending/failed/rk9-in-progress).
   * Queued rows are excluded — they are already queued.
   * Batches both sources into two parallel calls.
   */
  async function handleBulkImportSelected() {
    const importableSelected = [
      ...rk9Rows.filter(
        (r) =>
          selectedIds.has(r.id) &&
          r.status !== "upcoming" &&
          r.displayStatus !== "queued" &&
          (r.rk9!.import_status === "pending" ||
            r.rk9!.import_status === "failed" ||
            r.rk9!.import_status === "roster" ||
            r.rk9!.import_status === "teams")
      ),
      ...limitlessRows.filter(
        (r) =>
          selectedIds.has(r.id) &&
          r.displayStatus !== "queued" &&
          (!r.limitless!.import_status ||
            r.limitless!.import_status === "failed")
      ),
    ];

    const limitlessIds = importableSelected
      .filter((r) => r.source === "limitless")
      .map((r) => r.limitless!.tournament_id);

    const rk9ImportIds = importableSelected
      .filter((r) => r.source === "rk9")
      .map((r) => r.rk9!.event_id);

    setBatchQueuing(true);
    try {
      const [lResult, rResult] = await Promise.all([
        limitlessIds.length > 0
          ? batchQueueTournaments(limitlessIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
        rk9ImportIds.length > 0
          ? batchQueueRk9Events(rk9ImportIds)
          : Promise.resolve({ success: true as const, data: { queued: 0 } }),
      ]);
      if (!lResult.success) throw new Error(lResult.error);
      if (!rResult.success) throw new Error(rResult.error);
      const total = lResult.data.queued + rResult.data.queued;
      toast.success(
        total > 0
          ? `Queued ${total} — imports run in the background. Use Process now to start immediately.`
          : "No new items to queue"
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to queue events"));
    } finally {
      setBatchQueuing(false);
    }
    setSelectedIds(new Set());
    setRefreshKey((k) => k + 1);
  }

  // -------------------------------------------------------------------------
  // Auto-import loop
  // When enabled, process one pending item at a time from each source.
  // -------------------------------------------------------------------------

  // RK9 sub-view: events or players
  const [rk9View, setRk9View] = useState<"events" | "players">("events");

  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: currentRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
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
      value: "queued",
      label: "Queued",
      count: sourceStatusCounts["queued"] ?? 0,
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
        limitless={{
          queued: limitlessQueuedCount,
          importing: limitlessImportingCount,
          failed: limitlessFailedCount,
        }}
        rk9={{
          queued: rk9QueuedCount,
          inProgress: rk9InProgressCount,
          failed: rk9FailedCount,
        }}
        recentImported={recentImported}
        autoImportOn={{
          limitless: limitlessBackendAutoImport,
          rk9: rk9BackendAutoImport,
        }}
        processing={processing}
        onProcessNow={handleProcessNow}
        onUnqueueAll={handleUnqueueAll}
        onResetStuck={handleResetStuck}
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

        {/* RK9 Players sub-view (search + table) vs the shared events toolbar */}
        {filters.source === "rk9" && rk9View === "players" ? (
          <PlayersView
            active={filters.source === "rk9" && rk9View === "players"}
            refreshKey={refreshKey}
          />
        ) : (
          <>
            {/* Single toolbar — unified Sync + Import vocabulary */}
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
              onCalculateUsage={handleCalculateUsage}
              calculatingUsage={calculatingUsage}
              lastCalculatedAt={lastCalculatedAt}
              // Unified Sync: RK9=discover, Limitless=sync, All=both
              onSync={
                filters.source === "rk9"
                  ? handleDiscover
                  : filters.source === "limitless"
                    ? handleSync
                    : async () => {
                        await Promise.all([handleDiscover(), handleSync()]);
                      }
              }
              syncing={isDiscovering || syncing}
              // Unified Import matching (filter-scoped importable rows)
              onImportMatching={handleImportMatching}
              importMatchingCount={importMatchingCount}
              // Unified Import all (all importable rows, ignores filters)
              onImportAll={handleImportAll}
              importAllCount={importAllCount}
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
        selectedCount={selectedIds.size}
        bulkProcessing={bulkProcessing}
        onClear={() => setSelectedIds(new Set())}
        importEligibleCount={importEligibleSelectedCount}
        onImportSelected={handleBulkImportSelected}
        unqueueEligibleCount={unqueueEligibleCount}
        onUnqueueSelected={handleUnqueueSelected}
        resetEligibleCount={resetEligibleSelected.length}
        onResetEvents={handleBulkResetEvents}
      />
      {bulkProcessing && bulkProgress && (
        <span className="text-muted-foreground text-xs">
          {bulkProgress.done}/{bulkProgress.total} — {bulkProgress.current}
        </span>
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
                  ? "No RK9 events found. Click Sync to fetch events."
                  : filters.source === "limitless"
                    ? "No Limitless tournaments found. Click Sync to fetch tournaments."
                    : "No events found. Click Sync to fetch the latest from each source."
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
                        queuingIds={queuingIds}
                        batchQueuing={batchQueuing}
                        isUpcomingRow={row.status === "upcoming"}
                        onImport={handleImport}
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
                              <StatusBadge row={row} />
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
                                queuingIds={queuingIds}
                                batchQueuing={batchQueuing}
                                isUpcomingRow={isUpcomingRow}
                                onImport={handleImport}
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
