"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@trainers/supabase/react-query";
import { type ActionResult } from "@trainers/validators";
import { columns as orgColumns, type CommunityRow } from "./columns";
import {
  columns as requestColumns,
  type CommunityRequestRow,
} from "@/app/(app)/admin/community-requests/columns";
import { CommunityDetailSheet } from "./community-detail-sheet";
import { RequestDetailSheet } from "@/app/(app)/admin/community-requests/request-detail-sheet";
import { ProvisionAllCommunitiesButton } from "@/components/admin/provision-all-communities-button";
import {
  type AdminCommunityRow,
  type AdminCommunityRequestRow,
  type AdminCommunitiesResponse,
} from "@/app/api/v1/admin/communities/route";

// --- Constants ---

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

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

// --- Fetchers ---

/**
 * Fetch communities from the admin API route.
 *
 * The route is backed by `listCommunitiesAdmin` via a service-role client,
 * so it survives the Phase 2 anon-revoke on `communities` (T3h).
 */
async function fetchCommunities(
  search: string | undefined,
  status: string | undefined,
  limit: number,
  offset: number
): Promise<ActionResult<AdminCommunitiesResponse>> {
  const params = new URLSearchParams();
  params.set("type", "communities");
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const res = await fetch(`/api/v1/admin/communities?${params.toString()}`);
  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` };
  }
  const result = (await res.json()) as AdminCommunitiesResponse;
  return { success: true, data: result };
}

/**
 * Fetch community requests from the admin API route.
 *
 * The route is backed by `listOrgRequestsAdmin` via a service-role client,
 * so it survives the Phase 2 anon-revoke on `community_requests` (T3h).
 */
async function fetchRequests(
  search: string | undefined,
  status: string | undefined,
  limit: number,
  offset: number
): Promise<ActionResult<AdminCommunitiesResponse>> {
  const params = new URLSearchParams();
  params.set("type", "requests");
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const res = await fetch(`/api/v1/admin/communities?${params.toString()}`);
  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` };
  }
  const result = (await res.json()) as AdminCommunitiesResponse;
  return { success: true, data: result };
}

// --- Component ---

export default function AdminCommunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Detail sheet state — communities
  const [selectedCommunity, setSelectedCommunity] =
    useState<CommunityRow | null>(null);
  const [communitySheetOpen, setCommunitySheetOpen] = useState(false);

  // Detail sheet state — requests
  const [selectedRequest, setSelectedRequest] =
    useState<CommunityRequestRow | null>(null);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);

  // Increment to force queries to re-fetch after actions
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the search input — setState inside setTimeout satisfies set-state-in-effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const isRequestsOnly = statusFilter === "requests";
  const isAll = statusFilter === "all";
  const showOrgs = !isRequestsOnly;
  const showRequests = isRequestsOnly || isAll;

  // Fetch organizations via /api/v1/admin/communities?type=communities
  const orgsQuery = useApiQuery<AdminCommunitiesResponse>(
    [
      "admin",
      "communities",
      "orgs",
      debouncedSearch,
      statusFilter,
      page,
      refreshKey,
    ],
    () =>
      fetchCommunities(
        debouncedSearch || undefined,
        isAll ? undefined : statusFilter,
        PAGE_SIZE,
        page * PAGE_SIZE
      ),
    { staleTime: 30_000, enabled: showOrgs }
  );

  // Fetch community requests via /api/v1/admin/communities?type=requests
  // When in "All" view, only show pending requests
  const requestsQuery = useApiQuery<AdminCommunitiesResponse>(
    [
      "admin",
      "communities",
      "requests",
      debouncedSearch,
      statusFilter,
      page,
      refreshKey,
    ],
    () =>
      fetchRequests(
        debouncedSearch || undefined,
        isAll ? "pending" : undefined,
        PAGE_SIZE,
        isRequestsOnly ? page * PAGE_SIZE : 0
      ),
    { staleTime: 30_000, enabled: showRequests }
  );

  const organizations = (orgsQuery.data?.data ??
    []) as unknown as AdminCommunityRow[] as unknown as CommunityRow[];
  const requests = (requestsQuery.data?.data ??
    []) as unknown as AdminCommunityRequestRow[] as unknown as CommunityRequestRow[];

  // For pagination: use community count when not in requests-only view
  const totalCount = isRequestsOnly
    ? (requestsQuery.data?.count ?? 0)
    : (orgsQuery.data?.count ?? 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = isRequestsOnly
    ? requestsQuery.isLoading
    : orgsQuery.isLoading;
  const isError = isRequestsOnly ? requestsQuery.isError : orgsQuery.isError;
  const error = isRequestsOnly ? requestsQuery.error : orgsQuery.error;

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header row: title + actions + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {isRequestsOnly ? "Community Requests" : "Communities"}
            {!isLoading && !isAll && (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({totalCount})
              </span>
            )}
          </h2>
          {!isRequestsOnly && <ProvisionAllCommunitiesButton />}
        </div>
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
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load data. Please try again."}
          </AlertDescription>
        </Alert>
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
              setSelectedCommunity(row);
              setCommunitySheetOpen(true);
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

      {/* Pagination (for community-filtered or requests-only views) */}
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
        community={selectedCommunity}
        open={communitySheetOpen}
        onOpenChange={setCommunitySheetOpen}
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
