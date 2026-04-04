"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { COUNTRIES } from "@trainers/utils";
import { PlayerGrid } from "./player-grid";
import type {
  PlayerDirectoryEntry,
  SearchPlayersResult,
  PlayerSortOption,
} from "@trainers/supabase/queries";

// ============================================================================
// Sentinel for render-time state initialization
// ============================================================================

const UNINITIALIZED = Symbol();

// ============================================================================
// Query key factory for player search
// ============================================================================

export const playerDirectoryKeys = {
  all: ["player-directory"] as const,
  search: (params: {
    q: string;
    country: string;
    sort: PlayerSortOption;
    page: number;
  }) => [...playerDirectoryKeys.all, "search", params] as const,
};

// ============================================================================
// Search fetcher
// ============================================================================

async function fetchPlayerSearch(params: {
  q: string;
  country: string;
  sort: PlayerSortOption;
  page: number;
}): Promise<SearchPlayersResult> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.country) searchParams.set("country", params.country);
  if (params.sort) searchParams.set("sort", params.sort);
  searchParams.set("page", String(params.page));

  const response = await fetch(`/api/players/search?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to search players");
  }
  return response.json() as Promise<SearchPlayersResult>;
}

// ============================================================================
// Debounce hook
// ============================================================================

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ============================================================================
// Main component
// ============================================================================

interface PlayerSearchProps {
  /** Initial player data from server-side render */
  initialData: {
    players: PlayerDirectoryEntry[];
    totalCount: number;
    page: number;
  };
}

/**
 * Client component that handles player search, filters, and results.
 * Uses TanStack Query for client-side search results with debouncing.
 * Falls back to server-provided initial data when no search is active.
 */
export function PlayerSearch({ initialData }: PlayerSearchProps) {
  const [searchInput, setSearchInput] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState<PlayerSortOption>("tournaments");
  const [page, setPage] = useState(1);

  // Debounce search input by 300ms
  const debouncedQuery = useDebouncedValue(searchInput, 300);

  // Track whether user has interacted with search/filters
  const hasFilters =
    debouncedQuery.length > 0 || country.length > 0 || sort !== "tournaments";
  const isClientSearch = hasFilters || page > 1;

  // Reset page when filters change — render-time adjustment keyed on a compound value
  const filterKey = `${debouncedQuery}|${country}|${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState<typeof filterKey | symbol>(
    UNINITIALIZED
  );
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // TanStack Query for search results
  const {
    data: searchData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: playerDirectoryKeys.search({
      q: debouncedQuery,
      country,
      sort,
      page,
    }),
    queryFn: () =>
      fetchPlayerSearch({ q: debouncedQuery, country, sort, page }),
    // Only fetch when user has interacted with search/filters
    enabled: isClientSearch,
    // Keep previous data while loading new results
    placeholderData: (previousData) => previousData,
  });

  // Use search results if available, otherwise use initial server data
  const displayData = isClientSearch
    ? (searchData ?? initialData)
    : initialData;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search players by username..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Country filter */}
        <Select
          value={country}
          onValueChange={(value) =>
            setCountry(value === "__all__" ? "" : (value as string))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Countries</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort dropdown */}
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as PlayerSortOption)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tournaments">Most Tournaments</SelectItem>
            <SelectItem value="win_rate">Highest Win Rate</SelectItem>
            <SelectItem value="newest">Newest Members</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>

        {/* Loading indicator */}
        {isFetching && !isLoading && (
          <span className="text-muted-foreground text-sm">Searching...</span>
        )}
      </div>

      {/* Results grid */}
      <PlayerGrid
        players={displayData.players}
        totalCount={displayData.totalCount}
        page={displayData.page}
        onPageChange={setPage}
        isSearching={isClientSearch}
      />
    </div>
  );
}
