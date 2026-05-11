"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface LimitlessTournamentRow {
  tournament_id: string;
  name: string;
  format_id: string;
  date: string;
  player_count: number;
  platform: string | null;
  is_online: boolean;
  decklists: boolean;
  organizer_name: string | null;
  imported_at: string;
  data_imported_at: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<LimitlessTournamentRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Tournament</SortableHeader>
    ),
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.name}</span>
          <a
            href={`https://play.limitlesstcg.com/tournament/${row.original.tournament_id}/standings`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          {row.original.tournament_id}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "format_id",
    header: "Format",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono text-xs">
        {row.original.format_id}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <SortableHeader column={column}>Date</SortableHeader>
    ),
    cell: ({ row }) => <span className="text-sm">{row.original.date}</span>,
  },
  {
    accessorKey: "player_count",
    header: ({ column }) => (
      <SortableHeader column={column}>Players</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.player_count}</span>
    ),
  },
  {
    accessorKey: "data_imported_at",
    header: "Status",
    cell: ({ row }) =>
      row.original.data_imported_at ? (
        <Badge variant="default" className="text-xs">
          Imported
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs">
          Synced only
        </Badge>
      ),
  },
  {
    accessorKey: "decklists",
    header: "Teams",
    cell: ({ row }) =>
      row.original.decklists ? (
        <Badge variant="default" className="text-xs">
          Yes
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LimitlessData() {
  const router = useRouter();

  // Search + filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Refresh trigger
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
  const [prevFormat, setPrevFormat] = useState(formatFilter);
  if (formatFilter !== prevFormat) {
    setPrevFormat(formatFilter);
    setPage(0);
  }

  // -------------------------------------------------------------------------
  // Fetch tournaments from DB
  // -------------------------------------------------------------------------

  const {
    data: result,
    error: queryError,
    isLoading,
  } = useSupabaseQuery(
    async (sb) => {
      let query = sb
        .schema("limitless")
        .from("tournaments")
        .select("*", { count: "exact" });

      if (formatFilter !== "all") {
        query = query.eq("format_id", formatFilter);
      }

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      query = query
        .order("date", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { tournaments: data ?? [], total: count ?? 0 };
    },
    [debouncedSearch, formatFilter, page, refreshKey]
  );

  // -------------------------------------------------------------------------
  // Fetch distinct formats for the filter dropdown
  // -------------------------------------------------------------------------

  const { data: formats } = useSupabaseQuery(
    async (sb) => {
      // Use .range() to bypass PostgREST default 1000-row limit
      const { data, error } = await sb
        .schema("limitless")
        .from("tournaments")
        .select("format_id")
        .order("format_id")
        .range(0, 9999);

      if (error) throw error;
      const unique = [...new Set((data ?? []).map((r) => r.format_id))];
      return unique;
    },
    [refreshKey]
  );

  const tournaments = result?.tournaments ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Imported Data</h2>
          <p className="text-muted-foreground text-sm">
            Browse {total} tournament{total !== 1 ? "s" : ""} in the database
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
            placeholder="Search tournaments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={formatFilter}
          onValueChange={(v) => setFormatFilter(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            {(formats ?? []).map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
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
          data={tournaments}
          manualPagination
          emptyMessage="No tournaments found. Sync the list from the Import tab first."
          onRowClick={(row) => {
            if (row.data_imported_at) {
              router.push(`/admin/limitless/${row.tournament_id}`);
            }
          }}
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
