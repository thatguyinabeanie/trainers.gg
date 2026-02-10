"use client";

import { useState, useCallback, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Activity, RefreshCw } from "lucide-react";
import { getAuditLog, getAuditLogStats } from "@trainers/supabase";
import type { TypedSupabaseClient, Database } from "@trainers/supabase";
import { useSupabaseQuery } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { columns, type AuditLogEntry } from "./columns";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// --- Constants ---

const PAGE_SIZE = 50;

// Action filter categories — maps a category key to the actions it includes
const actionCategories = [
  { value: "all", label: "All Actions" },
  { value: "match", label: "Match Events" },
  { value: "judge", label: "Judge Actions" },
  { value: "tournament", label: "Tournament Events" },
  { value: "admin", label: "Admin Actions" },
  { value: "team", label: "Team Events" },
  { value: "registration", label: "Registration Events" },
] as const;

const categoryActions: Record<string, AuditAction[]> = {
  match: [
    "match.score_submitted",
    "match.score_agreed",
    "match.score_disputed",
    "match.result_reported",
    "match.staff_requested",
    "match.staff_resolved",
  ],
  judge: [
    "judge.game_reset",
    "judge.match_reset",
    "judge.game_override",
    "judge.match_override",
  ],
  tournament: [
    "tournament.started",
    "tournament.round_created",
    "tournament.round_started",
    "tournament.round_completed",
    "tournament.phase_advanced",
    "tournament.completed",
  ],
  admin: [
    "admin.sudo_activated",
    "admin.sudo_deactivated",
    "admin.user_suspended",
    "admin.user_unsuspended",
    "admin.role_granted",
    "admin.role_revoked",
    "admin.impersonation_started",
    "admin.impersonation_ended",
    "admin.org_approved",
    "admin.org_rejected",
    "admin.org_suspended",
    "admin.org_unsuspended",
    "admin.org_ownership_transferred",
    "admin.flag_created",
    "admin.flag_toggled",
    "admin.flag_deleted",
    "admin.announcement_created",
    "admin.announcement_updated",
    "admin.announcement_deleted",
  ],
  team: ["team.submitted", "team.locked", "team.unlocked"],
  registration: [
    "registration.checked_in",
    "registration.dropped",
    "registration.late_checkin",
  ],
};

// Entity type filter options
const entityTypes = [
  { value: "all", label: "All Entities" },
  { value: "tournament", label: "Tournaments" },
  { value: "match", label: "Matches" },
  { value: "organization", label: "Organizations" },
] as const;

// --- Component ---

export default function AdminActivityPage() {
  // Filter state
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute the action list for the current filter
  const actionsForFilter: AuditAction[] | undefined = useMemo(
    () => categoryActions[actionFilter],
    [actionFilter]
  );

  // Compute entity type param
  const entityType = useMemo(
    () =>
      entityFilter === "all"
        ? undefined
        : (entityFilter as "tournament" | "match" | "organization"),
    [entityFilter]
  );

  // Fetch stats (24h, 7d, 30d)
  const statsQueryFn = useCallback(
    (client: TypedSupabaseClient) => getAuditLogStats(client),
    []
  );
  const { data: stats, isLoading: statsLoading } = useSupabaseQuery(
    statsQueryFn,
    [refreshKey]
  );

  // Fetch audit log entries
  const logQueryFn = useCallback(
    (client: TypedSupabaseClient) =>
      getAuditLog(client, {
        actions: actionsForFilter,
        entityType,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [actionsForFilter, entityType, page]
  );
  const {
    data: logResult,
    isLoading: logLoading,
    refetch,
  } = useSupabaseQuery(logQueryFn, [
    actionFilter,
    entityFilter,
    page,
    refreshKey,
  ]);

  const entries = (logResult?.data ?? []) as AuditLogEntry[];
  const totalCount = logResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // TanStack Table instance (server-side pagination, no client-side sorting/filtering)
  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page, pageSize: PAGE_SIZE },
    },
  });

  // Handlers
  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  const handleActionFilterChange = (value: string | null) => {
    if (value) {
      setActionFilter(value);
      setPage(0);
    }
  };

  const handleEntityFilterChange = (value: string | null) => {
    if (value) {
      setEntityFilter(value);
      setPage(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Last 24 Hours"
          value={stats?.total24h}
          isLoading={statsLoading}
        />
        <StatCard
          title="Last 7 Days"
          value={stats?.total7d}
          isLoading={statsLoading}
        />
        <StatCard
          title="Last 30 Days"
          value={stats?.total30d}
          isLoading={statsLoading}
        />
      </div>

      {/* Filters + Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action category filter */}
          <Select value={actionFilter} onValueChange={handleActionFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {actionCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity type filter */}
          <Select value={entityFilter} onValueChange={handleEntityFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  {et.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {logLoading ? (
              // Skeleton rows while loading
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="text-muted-foreground size-8 opacity-50" />
                    <p className="text-muted-foreground text-sm">
                      No activity found
                    </p>
                    {(actionFilter !== "all" || entityFilter !== "all") && (
                      <p className="text-muted-foreground text-xs">
                        Try adjusting the filters
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page + 1} of {totalPages} ({totalCount.toLocaleString()}{" "}
            total)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || logLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || logLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stat Card Sub-Component ---

function StatCard({
  title,
  value,
  isLoading,
}: {
  title: string;
  value: number | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Activity className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">
            {(value ?? 0).toLocaleString()}
          </div>
        )}
        <p className="text-muted-foreground text-xs">events</p>
      </CardContent>
    </Card>
  );
}
