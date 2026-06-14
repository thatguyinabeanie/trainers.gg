"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { getUsersByIds } from "@trainers/supabase";
import { type FeatureFlag } from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useSupabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { SearchPlayersResult } from "@/lib/data/players-search-endpoint";

interface FlagAllowlistSheetProps {
  flag: FeatureFlag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (allowedUserIds: string[]) => Promise<void>;
}

interface UserStub {
  id: string;
  username: string | null;
  image: string | null;
}

export function FlagAllowlistSheet({
  flag,
  open,
  onOpenChange,
  onSave,
}: FlagAllowlistSheetProps) {
  const supabase = useSupabase();

  // --- Allowlist state (local copy, committed on Save) ---
  const [allowedIds, setAllowedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // --- Search state ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setDebouncedSearch("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
    }, 300);
  }

  // Clear the debounce timer on unmount so a late-firing callback can't call
  // setDebouncedSearch on an unmounted component (which would log a warning
  // and trigger a state-update-on-unmounted warning in React).
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch current allowed users by their IDs via the authenticated browser
  // client. Disabled when the list is empty to avoid an unnecessary round-trip.
  const currentAllowedQuery = useQuery({
    queryKey: queryKeys.admin.usersByIds(allowedIds.join(",")),
    queryFn: () => getUsersByIds(supabase, allowedIds),
    enabled: allowedIds.length > 0,
    staleTime: 30_000,
  });
  const currentAllowedUsers: UserStub[] = currentAllowedQuery.data ?? [];

  // Search for users via GET /api/v1/players/search — auth-gated, server-side
  // service-role read that survives the Phase 2 Task 9 anon SELECT revoke on
  // the alts table. useApiQuery unwraps ActionResult<T>.
  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchIsError,
    error: searchError,
  } = useApiQuery<SearchPlayersResult>(
    ["players", "search", debouncedSearch],
    async () => {
      if (!debouncedSearch) {
        return {
          success: true as const,
          data: { players: [], totalCount: 0, page: 1 },
        };
      }
      const params = new URLSearchParams({ q: debouncedSearch });
      const res = await fetch(`/api/v1/players/search?${params.toString()}`);
      if (!res.ok) {
        return { success: false as const, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as SearchPlayersResult;
      return { success: true as const, data };
    },
    { enabled: !!debouncedSearch }
  );

  // Map PlayerDirectoryEntry shape → UserStub, filtering already-allowlisted users.
  const searchResults: UserStub[] = (searchData?.players ?? [])
    .filter((p) => !allowedIds.includes(p.userId))
    .map((p) => ({ id: p.userId, username: p.username, image: p.avatarUrl }));

  // Initialize allowedIds when the sheet opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && flag) {
      const meta = flag.metadata as { allowed_users?: string[] } | null;
      setAllowedIds(meta?.allowed_users ?? []);
      setSearch("");
      setDebouncedSearch("");
    }
    onOpenChange(nextOpen);
  }

  function addUser(user: UserStub) {
    setAllowedIds((prev) => [...prev, user.id]);
    setSearch("");
    setDebouncedSearch("");
  }

  function removeUser(userId: string) {
    setAllowedIds((prev) => prev.filter((id) => id !== userId));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(allowedIds);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save allowlist"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="font-mono text-base">{flag?.key}</SheetTitle>
          <SheetDescription>
            {flag?.description ?? "No description"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          <p className="text-muted-foreground text-sm">
            When this flag is <strong>globally enabled</strong>, everyone has
            access. The allowlist only applies when the flag is{" "}
            <strong>disabled</strong> — users listed here will still have
            access.
          </p>

          <Separator />

          {/* Current allowlist */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              Allowed users
              <span className="text-muted-foreground ml-2 font-normal">
                ({allowedIds.length})
              </span>
            </h3>

            {allowedIds.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No users allowlisted — flag must be globally enabled for anyone
                to access it.
              </p>
            ) : currentAllowedQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {currentAllowedUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage
                        src={user.image ?? undefined}
                        alt={user.username ?? "User"}
                      />
                      <AvatarFallback>
                        {(user.username ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">
                      @{user.username ?? user.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeUser(user.id)}
                      aria-label={`Remove ${user.username ?? user.id}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Add user search */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Add user</h3>
            <div className="space-y-2">
              <Label htmlFor="flag-user-search">Search by username</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="flag-user-search"
                  placeholder="Type a username..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {debouncedSearch && (
              <div className="rounded-lg border">
                {searchIsError ? (
                  <Alert variant="destructive" className="rounded-lg border-0">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>
                      {searchError instanceof Error
                        ? searchError.message
                        : "Failed to search users"}
                    </AlertDescription>
                  </Alert>
                ) : searchLoading ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    Searching...
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    No users found.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {searchResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          onClick={() => addUser(user)}
                        >
                          <Avatar className="size-7 shrink-0">
                            <AvatarImage
                              src={user.image ?? undefined}
                              alt={user.username ?? "User"}
                            />
                            <AvatarFallback>
                              {(user.username ?? "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm">
                            @{user.username ?? user.id}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — pb-16 clears the fixed sudo-mode indicator at bottom-4 */}
        <div className="border-t px-6 pt-4 pb-16">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
