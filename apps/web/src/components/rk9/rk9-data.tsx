"use client";

import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";

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
  imported_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<RK9EventRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Event</SortableHeader>
    ),
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.name}</span>
          <a
            href={`https://rk9.gg/tournament/${row.original.event_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="text-muted-foreground text-xs">
          {row.original.location_city}
          {row.original.location_country
            ? `, ${row.original.location_country}`
            : ""}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs capitalize">
        {row.original.tier}
      </Badge>
    ),
  },
  {
    accessorKey: "date_start",
    header: ({ column }) => (
      <SortableHeader column={column}>Date</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.date_start}</span>
    ),
  },
  {
    accessorKey: "player_count",
    header: ({ column }) => (
      <SortableHeader column={column}>Players</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.player_count ?? "—"}</span>
    ),
  },
  {
    accessorKey: "import_status",
    header: "Status",
    cell: ({ row }) => (
      <ImportStatusBadge status={row.original.import_status} />
    ),
  },
  {
    accessorKey: "has_team_lists",
    header: "Teams",
    cell: ({ row }) =>
      row.original.has_team_lists ? (
        <Badge variant="default" className="text-xs">
          Yes
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      ),
  },
];

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function ImportStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <Badge variant="default" className="text-xs">
          Complete
        </Badge>
      );
    case "roster":
      return (
        <Badge variant="secondary" className="text-xs">
          Roster only
        </Badge>
      );
    case "teams":
      return (
        <Badge variant="secondary" className="text-xs">
          Importing teams...
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          Failed
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
// Component
// ---------------------------------------------------------------------------

export function RK9Data() {
  // Search + filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  const [prevTier, setPrevTier] = useState(tierFilter);
  if (tierFilter !== prevTier) {
    setPrevTier(tierFilter);
    setPage(0);
  }

  // Fetch events from DB
  const {
    data: result,
    error: queryError,
    isLoading,
  } = useSupabaseQuery(
    async (sb) => {
      let query = sb
        .schema("rk9")
        .from("events")
        .select("*", { count: "exact" });

      if (tierFilter !== "all") {
        query = query.eq("tier", tierFilter);
      }

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      query = query
        .order("date_start", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { events: data ?? [], total: count ?? 0 };
    },
    [debouncedSearch, tierFilter, page, refreshKey]
  );

  const events = result?.events ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">RK9 Event Data</h2>
          <p className="text-muted-foreground text-sm">
            Browse {total} event{total !== 1 ? "s" : ""} in the database
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={tierFilter}
          onValueChange={(v) => setTierFilter(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="regional">Regional</SelectItem>
            <SelectItem value="international">International</SelectItem>
            <SelectItem value="special">Special</SelectItem>
            <SelectItem value="worlds">Worlds</SelectItem>
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
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={events}
          manualPagination
          emptyMessage="No events found. Use the Import tab to discover events from RK9."
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page + 1} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
