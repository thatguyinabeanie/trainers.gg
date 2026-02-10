"use client";

import { useState, useEffect, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { listOrganizationsAdmin } from "@trainers/supabase/queries";
import { columns, type OrgRow } from "./columns";
import { OrgDetailSheet } from "./org-detail-sheet";

// --- Constants ---

const PAGE_SIZE = 25;

type StatusFilter = "all" | "pending" | "active" | "suspended" | "rejected";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

// --- Component ---

export default function AdminOrganizationsPage() {
  // Filter / search state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Detail sheet state
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce search input using useEffect
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Fetch organizations with server-side filtering and pagination
  const { data, isLoading } = useSupabaseQuery(
    async (supabase) => {
      const result = await listOrganizationsAdmin(supabase, {
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      return result;
    },
    [debouncedSearch, statusFilter, page]
  );

  const organizations = (data?.data ?? []) as OrgRow[];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // TanStack table instance (rendering only, no client-side pagination)
  const table = useReactTable({
    data: organizations,
    columns: columns as ColumnDef<OrgRow, unknown>[],
    getCoreRowModel: getCoreRowModel(),
  });

  // Row click handler
  const handleRowClick = (org: OrgRow) => {
    setSelectedOrg(org);
    setSheetOpen(true);
  };

  // Tab change resets page
  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header row: title + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          Organizations
          {!isLoading && (
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

      {/* Status filter tabs */}
      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleStatusChange(tab.value)}
            className={cn(
              statusFilter === tab.value
                ? "font-medium"
                : "text-muted-foreground"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row.original)}
                    className="cursor-pointer"
                  >
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
                    className="h-24 text-center"
                  >
                    <p className="text-muted-foreground">
                      No organizations found
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
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

      {/* Detail sheet */}
      <OrgDetailSheet
        org={selectedOrg}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
