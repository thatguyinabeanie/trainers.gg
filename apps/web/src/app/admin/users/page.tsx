"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
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
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { listUsersAdmin } from "@trainers/supabase";
import { columns, type AdminUserRow } from "./columns";
import { UserDetailSheet } from "./user-detail-sheet";

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
// Component
// ----------------------------------------------------------------

export default function UsersPage() {
  // Data state
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // Detail sheet state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset to first page when search changes
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isLocked =
        statusFilter === "active"
          ? false
          : statusFilter === "suspended"
            ? true
            : undefined;

      const result = await listUsersAdmin(supabase, {
        search: debouncedSearch || undefined,
        isLocked,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setUsers(result.data as AdminUserRow[]);
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPreviousPage = page > 0;
  const canNextPage = page < totalPages - 1;

  // Row click handler — opens the detail sheet
  const handleRowClick = (row: AdminUserRow) => {
    setSelectedUserId(row.id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" />
          Users
          {!loading && (
            <span className="text-muted-foreground text-sm font-normal">
              ({totalCount})
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
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
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && users.length === 0 && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Data table */}
      {(!loading || users.length > 0) && (
        <DataTable columns={columns} data={users} onRowClick={handleRowClick} />
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
              disabled={!canPreviousPage || loading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNextPage || loading}
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
        onUserUpdated={fetchUsers}
      />
    </div>
  );
}
