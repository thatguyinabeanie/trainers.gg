"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";

import type { AltStats, PlayerRating } from "@trainers/supabase";

import { useSupabase } from "@/lib/supabase";
import {
  DASHBOARD_ALT_COOKIE,
  COOKIE_MAX_AGE,
} from "@/components/dashboard/sidebar-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { AltsTable } from "./components/alts-table";
import { CreateAltForm } from "./components/create-alt-form";

// =============================================================================
// Types
// =============================================================================

interface DashboardHomeClientProps {
  alts: Array<{
    id: number;
    username: string;
    avatar_url: string | null;
    is_public: boolean;
  }>;
  mainAltId: number | null;
  initialBulkStats: Record<number, AltStats> | undefined;
  initialBulkRatings: Record<number, PlayerRating> | undefined;
  selectedAltUsername: string | null;
  username: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function HomeClient({
  alts,
  mainAltId,
  initialBulkStats,
  initialBulkRatings,
  selectedAltUsername,
  username,
}: DashboardHomeClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const toastShown = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(
    selectedAltUsername
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  // refreshKey forces child query keys to update after mutations
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync local state when server prop changes (e.g., sidebar alt switcher)
  const [prevSelectedAltProp, setPrevSelectedAltProp] =
    useState(selectedAltUsername);
  if (selectedAltUsername !== prevSelectedAltProp) {
    setPrevSelectedAltProp(selectedAltUsername);
    setSelectedAlt(selectedAltUsername);
  }

  // ── Realtime subscription for active match changes ──────────────────────
  useEffect(() => {
    if (!mainAltId) return;

    // router.refresh() re-runs the server component, which re-fetches the active match
    // (uncached). Cached stats/ratings update only after a server action calls
    // invalidateDashboardCaches().
    function triggerRefresh() {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    }

    const channel = supabase
      .channel(`dashboard-matches-${mainAltId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `alt1_id=eq.${mainAltId}`,
        },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `alt2_id=eq.${mainAltId}`,
        },
        triggerRefresh
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (err) {
            console.error("Dashboard realtime failed:", status, err);
          } else {
            console.warn(
              "Dashboard realtime:",
              status,
              "(no error — likely a local dev WebSocket issue)"
            );
          }
          toast.warning(
            "Live updates disconnected. Refresh the page to see the latest data.",
            { duration: 10000 }
          );
        }
      });

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [supabase, mainAltId, router]);

  // ── Welcome toast for temp usernames ────────────────────────────────────
  useEffect(() => {
    if (toastShown.current) return;
    if (username.startsWith("temp_") || username.startsWith("user_")) {
      toastShown.current = true;
      toast.info(
        "Welcome to trainers.gg! You can set your username and profile details in Settings.",
        { duration: 8000 }
      );
    }
  }, [username]);

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleAltSelect(username: string | null) {
    setSelectedAlt(username);
    // Sync cookie so sidebar alt switcher and page.tsx stay in sync
    if (username) {
      document.cookie = `${DASHBOARD_ALT_COOKIE}=${encodeURIComponent(username)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      document.cookie = `${DASHBOARD_ALT_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
    router.refresh();
  }

  function handleRefresh() {
    // Server action already invalidates caches — router.refresh() re-runs
    // the server component which re-fetches everything
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  const hasAlts = alts.length > 0;

  // ── Empty state (no alts) ───────────────────────────────────────────────
  // DashboardStats is rendered by the server parent with zero values,
  // so we only render the empty card + create form here.
  if (!hasAlts) {
    return (
      <>
        {/* Create form if open */}
        {showCreateForm && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateAltForm
              onCreated={() => {
                setShowCreateForm(false);
                handleRefresh();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Empty state card */}
        <Card className="bg-muted/30 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
              <Users className="text-primary size-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No alts yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              Create your first player identity to register for tournaments and
              track your competitive journey
            </p>
            <Button
              className="mt-6 gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="size-4" />
              Create Your First Alt
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  // LiveMatchBar and DashboardStats are rendered by the server parent.
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Your Alts</h2>
        <Button
          size="sm"
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          <Plus className="mr-1 size-3.5" /> New Alt
        </Button>
      </div>

      {/* Create form — slides in above the table */}
      {showCreateForm && (
        <div className="animate-in slide-in-from-top-2 mb-3 duration-200">
          <CreateAltForm
            onCreated={() => {
              setShowCreateForm(false);
              handleRefresh();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Alts table with inline stats and expand/collapse */}
      <AltsTable
        alts={alts}
        mainAltId={mainAltId}
        bulkStats={initialBulkStats}
        bulkRatings={initialBulkRatings}
        selectedAltUsername={selectedAlt}
        onAltSelect={handleAltSelect}
        onRefresh={handleRefresh}
        refreshKey={refreshKey}
      />
    </div>
  );
}
