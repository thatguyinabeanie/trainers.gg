"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Search,
  UserPlus,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiQuery } from "@trainers/supabase/react-query";
import { type ActionResult } from "@trainers/validators";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryKeys } from "@/lib/query-keys";

import { grantCoachStatusAction, revokeCoachStatusAction } from "./actions";

function coachLabel(c: {
  username: string | null;
  name?: string | null;
  id: string;
}): string {
  if (c.username) return `@${c.username}`;
  if (c.name) return c.name;
  return c.id;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by listCoaches — mirrors the query select columns. */
interface CoachRow {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  is_coach: boolean;
  main_alt_id: number | null;
}

/** Minimal user shape returned by the admin user-search endpoint. */
interface UserSearchRow {
  id: string;
  username: string | null;
  image: string | null;
}

interface CoachesManagerProps {
  /** Server-rendered initial coach list (used as TanStack Query initialData). */
  coaches: CoachRow[];
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

/** Stable query key for the admin coaches list endpoint. */
const COACHES_QUERY_KEY = ["admin", "coaches"] as const;

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch the coaches list from the admin API.
 * Returns `ActionResult<CoachRow[]>` for consumption by `useApiQuery`.
 */
async function fetchCoaches(): Promise<ActionResult<CoachRow[]>> {
  const res = await fetch("/api/v1/admin/coaches");
  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` };
  }
  return res.json() as Promise<ActionResult<CoachRow[]>>;
}

/**
 * Search for users by username via the gated admin users route.
 * The route returns `{ data: [...users], count }` — not an ActionResult envelope —
 * so we use a plain fetch and throw on HTTP errors to let useQuery handle the
 * error state.
 */
async function fetchUserSearch(search: string): Promise<UserSearchRow[]> {
  const url = new URL("/api/v1/admin/users", window.location.origin);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`User search failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data: UserSearchRow[]; count: number };
  return json.data ?? [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachesManager({
  coaches: initialCoaches,
}: CoachesManagerProps) {
  const queryClient = useQueryClient();

  // --- Coaches list via TanStack Query (repoints away from useSupabaseQuery) ---
  const {
    data: coaches = initialCoaches,
    isError: isCoachesError,
    error: coachesError,
  } = useApiQuery<CoachRow[]>(COACHES_QUERY_KEY, fetchCoaches, {
    // Server rendered prop is the initial value — no loading flash on mount.
    initialData: initialCoaches,
    staleTime: 30_000,
  });

  // --- Revoke dialog state ---
  const [revokeTarget, setRevokeTarget] = useState<CoachRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  // --- Grant search state ---
  const [grantSearch, setGrantSearch] = useState("");
  const [debouncedGrantSearch, setDebouncedGrantSearch] = useState("");
  const [grantTarget, setGrantTarget] = useState<{
    id: string;
    username: string | null;
    image: string | null;
  } | null>(null);
  const [isGranting, setIsGranting] = useState(false);

  // Ref-based debounce for the grant search input — avoids stale closure issues
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  function handleGrantSearchChange(value: string) {
    setGrantSearch(value);
    setGrantTarget(null);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!value.trim()) {
      setDebouncedGrantSearch("");
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedGrantSearch(value.trim());
    }, 300);
  }

  // Search for users to grant coach status to — gated admin API route.
  // Uses a plain useQuery (not useApiQuery) because /api/v1/admin/users returns
  // { data, count } rather than the ActionResult envelope that useApiQuery expects.
  const searchQuery = useQuery({
    queryKey: queryKeys.admin.userSearch(debouncedGrantSearch),
    queryFn: () => fetchUserSearch(debouncedGrantSearch),
    enabled: Boolean(debouncedGrantSearch),
    staleTime: 30_000,
  });

  const searchResults = (searchQuery.data ?? []).filter(
    (u) => !coaches.some((c) => c.id === u.id)
  );

  // --- Revoke handler ---
  async function handleRevoke() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const result = await revokeCoachStatusAction(
        revokeTarget.id,
        revokeReason.trim() || undefined
      );
      if (result.success) {
        toast.success(`Coach status revoked from ${coachLabel(revokeTarget)}`);
        setRevokeTarget(null);
        setRevokeReason("");
        // Invalidate the coaches query so the list refreshes without a full page reload.
        await queryClient.invalidateQueries({ queryKey: COACHES_QUERY_KEY });
      } else {
        toast.error(result.error ?? "Failed to revoke coach status");
      }
    } finally {
      setIsRevoking(false);
    }
  }

  // --- Grant handler ---
  async function handleGrant() {
    if (!grantTarget) return;
    setIsGranting(true);
    try {
      const result = await grantCoachStatusAction(grantTarget.id);
      if (result.success) {
        toast.success(`Coach status granted to ${coachLabel(grantTarget)}`);
        setGrantSearch("");
        setDebouncedGrantSearch("");
        setGrantTarget(null);
        // Invalidate the coaches query so the list refreshes without a full page reload.
        await queryClient.invalidateQueries({ queryKey: COACHES_QUERY_KEY });
      } else {
        toast.error(result.error ?? "Failed to grant coach status");
      }
    } finally {
      setIsGranting(false);
    }
  }

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Coaches list error state                                            */}
      {/* ------------------------------------------------------------------ */}
      {isCoachesError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {coachesError instanceof Error
              ? coachesError.message
              : "Failed to load coaches"}
          </AlertDescription>
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Current coaches list                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          Current coaches
          <span className="text-muted-foreground ml-2 font-normal">
            ({coaches.length})
          </span>
        </h3>

        {coaches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No coaches yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {coaches.map((coach) => {
              const initials = (coach.username ?? coach.name ?? "?")
                .charAt(0)
                .toUpperCase();

              return (
                <li
                  key={coach.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage
                      src={coach.image ?? undefined}
                      alt={coach.username ?? "Coach"}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {coach.name ?? coach.username ?? "Unknown"}
                    </p>
                    {coach.username && (
                      <Link
                        href={`/coaching/${coach.username}`}
                        className="text-muted-foreground hover:text-foreground truncate text-xs transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        @{coach.username}
                      </Link>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => {
                      setRevokeTarget(coach);
                      setRevokeReason("");
                    }}
                  >
                    <X className="size-3.5" />
                    Revoke
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* Grant coach status                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="size-4" />
          Grant coach status
        </h3>

        <div className="space-y-2">
          <Label htmlFor="grant-search">Search by username</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              id="grant-search"
              placeholder="Type a username..."
              value={grantSearch}
              onChange={(e) => handleGrantSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Search results */}
        {debouncedGrantSearch && !grantTarget && (
          <div className="rounded-lg border">
            {searchQuery.isLoading ? (
              <p className="text-muted-foreground p-3 text-sm">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">
                No users found
                {coaches.length > 0 && " (already-coached users are excluded)"}.
              </p>
            ) : (
              <ul className="divide-y">
                {searchResults.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      onClick={() => {
                        setGrantTarget(user);
                        setGrantSearch(user.username ?? user.id);
                        setDebouncedGrantSearch("");
                      }}
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

        {/* Selected user ready to grant */}
        {grantTarget && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage
                src={grantTarget.image ?? undefined}
                alt={grantTarget.username ?? "User"}
              />
              <AvatarFallback>
                {(grantTarget.username ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-medium">
              @{grantTarget.username ?? grantTarget.id}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGrantTarget(null);
                setGrantSearch("");
                setDebouncedGrantSearch("");
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <Button
          onClick={handleGrant}
          disabled={!grantTarget || isGranting}
          className="w-full"
        >
          <UserPlus className="size-4" />
          {isGranting ? "Granting..." : "Grant Coach Status"}
        </Button>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Revoke confirm dialog                                               */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke coach status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove coach status from{" "}
              <strong>
                {revokeTarget ? coachLabel(revokeTarget) : "this coach"}
              </strong>
              . Their coach profile will be hidden but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Textarea
              id="revoke-reason"
              placeholder="Explain why coach status is being revoked..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              variant="destructive"
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
