"use client";

import { useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { PokemonSprite } from "@/components/tournament/pokemon-sprite";
import { cn } from "@/lib/utils";

export type TournamentHistoryRow = {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  organizationName: string;
  organizationSlug: string;
  startDate: string | null;
  endDate: string | null;
  format: string | null;
  altId: number;
  altUsername: string;
  altDisplayName: string | null;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
  teamPokemon: string[];
  registeredAt: string | null;
};

interface TournamentHistoryTableProps {
  data: TournamentHistoryRow[];
}

function getPlacementLabel(placement: number | null): string {
  if (!placement) return "—";
  if (placement === 1) return "1st";
  if (placement === 2) return "2nd";
  if (placement === 3) return "3rd";
  if (placement <= 8) return `Top ${placement}`;
  return `${placement}th`;
}

function getRecordLabel(wins: number, losses: number, ties: number): string {
  if (ties > 0) return `${wins}-${losses}-${ties}`;
  return `${wins}-${losses}`;
}

export function TournamentHistoryTable({ data }: TournamentHistoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<TournamentHistoryRow>[] = [
    {
      accessorKey: "tournamentName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Tournament
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/tournaments/${row.original.tournamentSlug}`}
          className="text-foreground hover:text-primary font-medium transition-colors"
        >
          {row.original.tournamentName}
        </Link>
      ),
    },
    {
      accessorKey: "organizationName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Organization
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/organizations/${row.original.organizationSlug}`}
          className="text-muted-foreground hover:text-primary text-sm transition-colors"
        >
          {row.original.organizationName}
        </Link>
      ),
    },
    {
      accessorKey: "startDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.startDate ? (
          <span className="text-sm">
            {format(new Date(row.original.startDate), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.startDate
          ? new Date(rowA.original.startDate).getTime()
          : 0;
        const dateB = rowB.original.startDate
          ? new Date(rowB.original.startDate).getTime()
          : 0;
        return dateA - dateB;
      },
    },
    {
      accessorKey: "altUsername",
      header: "Alt",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.altDisplayName || row.original.altUsername}
        </span>
      ),
      filterFn: (row, id, value) => {
        return value === "all" || row.original.altUsername === value;
      },
    },
    {
      accessorKey: "teamPokemon",
      header: "Team",
      cell: ({ row }) => {
        const pokemon = row.original.teamPokemon;
        if (!pokemon || pokemon.length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div className="flex gap-0.5">
            {pokemon.slice(0, 6).map((species, idx) => (
              <PokemonSprite key={idx} species={species} size={28} />
            ))}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "placement",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Placement
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const placement = row.original.placement;
        return (
          <span
            className={cn(
              "text-sm font-medium",
              placement === 1 && "text-amber-500",
              placement === 2 && "text-slate-400",
              placement === 3 && "text-orange-600",
              placement &&
                placement >= 4 &&
                placement <= 8 &&
                "text-emerald-500"
            )}
          >
            {getPlacementLabel(placement)}
          </span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.placement ?? Infinity;
        const b = rowB.original.placement ?? Infinity;
        return a - b;
      },
    },
    {
      accessorKey: "record",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Record
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {getRecordLabel(
            row.original.wins,
            row.original.losses,
            row.original.ties
          )}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const aWins = rowA.original.wins;
        const bWins = rowB.original.wins;
        if (aWins !== bWins) return aWins - bWins;
        return rowA.original.losses - rowB.original.losses;
      },
    },
    {
      accessorKey: "format",
      header: "Format",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.format ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      filterFn: (row, id, value) => {
        return value === "all" || row.original.format === value;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Get unique alts and formats for filters
  const uniqueAlts = Array.from(
    new Set(data.map((row) => row.altUsername))
  ).sort();
  const uniqueFormats = Array.from(
    new Set(data.map((row) => row.format).filter(Boolean))
  ).sort();

  const altFilter = table.getColumn("altUsername");
  const formatFilter = table.getColumn("format");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search tournaments..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {uniqueAlts.length > 1 && (
            <Select
              value={
                (altFilter?.getFilterValue() as string | undefined) ?? "all"
              }
              onValueChange={(value) =>
                altFilter?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by alt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All alts</SelectItem>
                {uniqueAlts.map((alt) => (
                  <SelectItem key={alt} value={alt}>
                    {alt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {uniqueFormats.length > 1 && (
            <Select
              value={
                (formatFilter?.getFilterValue() as string | undefined) ?? "all"
              }
              onValueChange={(value) =>
                formatFilter?.setFilterValue(
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                {uniqueFormats.map((format) => (
                  <SelectItem key={format} value={format!}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="rounded-md border">
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
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground">
                    <p className="font-medium">No tournament history yet</p>
                    <p className="text-sm">
                      Register for a tournament to get started
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
