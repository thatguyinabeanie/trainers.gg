"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { listUsersAdmin } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { columns, type AdminUserRow } from "./columns";
import { UserDetailSheet } from "./user-detail-sheet";
import { InvitesTab } from "./invites-tab";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

/** Status filter options */
type StatusFilter = "all" | "active" | "suspended";

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "All Users",
  active: "Active",
  suspended: "Suspended",
};

// ----------------------------------------------------------------
// Users Tab Content
// ----------------------------------------------------------------

function UsersTabContent() {
  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // Detail sheet state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Manual refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  // Build query function
  const queryFn = useCallback(
    (supabase: TypedSupabaseClient) => {
      const isLocked =
        statusFilter === "active"
          ? false
          : statusFilter === "suspended"
            ? true
            : undefined;

      return listUsersAdmin(supabase, {
        search: debouncedSearch || undefined,
        isLocked,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
    },
    [debouncedSearch, statusFilter, page]
  );

  const { data, isLoading, error, refetch } = useSupabaseQuery(queryFn, [
    debouncedSearch,
    statusFilter,
    page,
    refreshKey,
  ]);

  const users = (data?.data ?? []) as AdminUserRow[];
  const totalCount = data?.count ?? 0;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPreviousPage = page > 0;
  const canNextPage = page < totalPages - 1;

  // Row click handler — opens the detail sheet
  const handleRowClick = (row: AdminUserRow) => {
    setSelectedUserId(row.id);
    setSheetOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" />
          Users
          {!isLoading && (
            <span className="text-muted-foreground text-sm font-normal">
              ({totalCount})
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            if (value) setStatusFilter(value as StatusFilter);
          }}
        >
          <SelectTrigger className="w-auto sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(statusFilterLabels) as StatusFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {statusFilterLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          Failed to load users: {error.message}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && users.length === 0 && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Data table */}
      {(!isLoading || users.length > 0) && (
        <DataTable
          columns={columns}
          data={users}
          onRowClick={handleRowClick}
          manualPagination
        />
      )}

      {/* Server-side pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!canPreviousPage || isLoading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNextPage || isLoading}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Sheet */}
      <UserDetailSheet
        userId={selectedUserId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUserUpdated={handleRefresh}
      />
    </div>
  );
}

// ----------------------------------------------------------------
// Main Page with Tabs
// ----------------------------------------------------------------

export default function UsersPage() {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">
          <Users className="size-4" />
          Users
        </TabsTrigger>
        <TabsTrigger value="invites">
          <Mail className="size-4" />
          Invites
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersTabContent />
      </TabsContent>

      <TabsContent value="invites">
        <InvitesTab />
      </TabsContent>
    </Tabs>
  );
}
