"use client";

import { useState, useEffect, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  listCommunitiesAdmin,
  listOrgRequestsAdmin,
} from "@trainers/supabase/queries";
import { columns as orgColumns, type CommunityRow } from "./columns";
import {
  columns as requestColumns,
  type CommunityRequestRow,
} from "@/app/(app)/admin/org-requests/columns";
import { CommunityDetailSheet } from "./community-detail-sheet";
import { RequestDetailSheet } from "@/app/(app)/admin/org-requests/request-detail-sheet";

// --- Constants ---

const PAGE_SIZE = 25;

type StatusFilter =
  | "all"
  | "pending"
  | "active"
  | "suspended"
  | "rejected"
  | "requests";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "requests", label: "Requests" },
];

// --- Component ---

export default function AdminCommunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Detail sheet state — orgs
  const [selectedOrg, setSelectedOrg] = useState<CommunityRow | null>(null);
  const [orgSheetOpen, setOrgSheetOpen] = useState(false);

  // Detail sheet state — requests
  const [selectedRequest, setSelectedRequest] =
    useState<CommunityRequestRow | null>(null);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);

  // Increment to force queries to re-fetch after actions
  const [refreshKey, setRefreshKey] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const isRequestsOnly = statusFilter === "requests";
  const isAll = statusFilter === "all";
  const showOrgs = !isRequestsOnly;
  const showRequests = isRequestsOnly || isAll;

  // Fetch organizations
  const orgsQuery = useSupabaseQuery(
    async (supabase) => {
      if (!showOrgs) return { data: [], count: 0 };
      return await listCommunitiesAdmin(supabase, {
        search: debouncedSearch || undefined,
        status: isAll ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
    },
    [debouncedSearch, statusFilter, page, refreshKey]
  );

  // Fetch org requests (for "All" and "Requests" views)
  // When in "All" view, only show pending requests
  const requestsQuery = useSupabaseQuery(
    async (supabase) => {
      if (!showRequests) return { data: [], count: 0 };
      return await listOrgRequestsAdmin(supabase, {
        search: debouncedSearch || undefined,
        status: isAll ? "pending" : undefined,
        limit: PAGE_SIZE,
        offset: isRequestsOnly ? page * PAGE_SIZE : 0,
      });
    },
    [debouncedSearch, statusFilter, page, refreshKey]
  );

  const organizations = (orgsQuery.data?.data ??
    []) as unknown as CommunityRow[];
  const requests = (requestsQuery.data?.data ??
    []) as unknown as CommunityRequestRow[];

  // For pagination: use org count when not in requests-only view
  const totalCount = isRequestsOnly
    ? ((requestsQuery.data?.count as number) ?? 0)
    : ((orgsQuery.data?.count as number) ?? 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = isRequestsOnly
    ? requestsQuery.isLoading
    : orgsQuery.isLoading;
  const error = isRequestsOnly ? requestsQuery.error : orgsQuery.error;

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header row: title + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          {isRequestsOnly ? "Community Requests" : "Communities"}
          {!isLoading && !isAll && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({totalCount})
            </span>
          )}
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleStatusChange(filter.value)}
            className={cn(
              statusFilter === filter.value
                ? "font-medium"
                : "text-muted-foreground"
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Failed to load data. Please try again.
        </div>
      )}

      {/* Tables */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isRequestsOnly ? (
        <DataTable
          columns={requestColumns as ColumnDef<CommunityRequestRow, unknown>[]}
          data={requests}
          manualPagination
          emptyMessage="No community requests found"
          onRowClick={(row) => {
            setSelectedRequest(row);
            setRequestSheetOpen(true);
          }}
        />
      ) : (
        <>
          <DataTable
            columns={orgColumns as ColumnDef<CommunityRow, unknown>[]}
            data={organizations}
            manualPagination
            emptyMessage="No communities found"
            onRowClick={(row) => {
              setSelectedOrg(row);
              setOrgSheetOpen(true);
            }}
          />

          {/* Show requests below orgs when "All" is selected */}
          {isAll && requests.length > 0 && (
            <div className="space-y-2 pt-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                Pending Requests ({requests.length})
              </h3>
              <DataTable
                columns={
                  requestColumns as ColumnDef<CommunityRequestRow, unknown>[]
                }
                data={requests}
                manualPagination
                emptyMessage="No community requests found"
                onRowClick={(row) => {
                  setSelectedRequest(row);
                  setRequestSheetOpen(true);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Pagination (for org-filtered or requests-only views) */}
      {!isLoading && totalPages > 1 && !isAll && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail sheets */}
      <CommunityDetailSheet
        org={selectedOrg}
        open={orgSheetOpen}
        onOpenChange={setOrgSheetOpen}
      />
      <RequestDetailSheet
        request={selectedRequest}
        open={requestSheetOpen}
        onOpenChange={setRequestSheetOpen}
        onActionComplete={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
