import type { TypedClient } from "../client";

// ── Return types ──────────────────────────────────────────────────────

export interface PlatformOverview {
  totalUsers: number;
  totalOrganizations: number;
  totalTournaments: number;
  totalMatches: number;
}

export interface UserGrowthEntry {
  date: string;
  count: number;
}

export interface ActiveUserStats {
  active7d: number;
  active30d: number;
}

export interface OrganizationStats {
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
}

export interface InviteConversionStats {
  totalSent: number;
  totalUsed: number;
  totalExpired: number;
  conversionRate: number;
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Count rows in a table using an exact head-only query.
 * Returns 0 when the count is null (empty table).
 */
async function countTable(
  supabase: TypedClient,
  table: "users" | "organizations" | "tournaments" | "tournament_matches"
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

/**
 * Return an ISO date string (YYYY-MM-DD) for a Date object.
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// ── Query functions ───────────────────────────────────────────────────

/**
 * Get high-level platform totals: users, organizations, tournaments,
 * and matches.
 */
export async function getPlatformOverview(
  supabase: TypedClient
): Promise<PlatformOverview> {
  // Run all four counts in parallel for speed.
  const [totalUsers, totalOrganizations, totalTournaments, totalMatches] =
    await Promise.all([
      countTable(supabase, "users"),
      countTable(supabase, "organizations"),
      countTable(supabase, "tournaments"),
      countTable(supabase, "tournament_matches"),
    ]);

  return { totalUsers, totalOrganizations, totalTournaments, totalMatches };
}

/**
 * Get daily user-signup counts for the last `days` days.
 *
 * Returns an array sorted by date (ascending), one entry per day that
 * had at least one signup. Days with zero signups are back-filled so the
 * returned array always has `days` entries.
 */
export async function getUserGrowthStats(
  supabase: TypedClient,
  days = 30
): Promise<UserGrowthEntry[]> {
  // Calculate the start-of-day boundary for the lookback window.
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("users")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Group rows by date string client-side.
  const countsByDate = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.created_at) continue;
    const dateKey = toDateString(new Date(row.created_at));
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  // Build a contiguous array covering every day in the range.
  const results: UserGrowthEntry[] = [];
  const cursor = new Date(since);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (cursor <= today) {
    const dateKey = toDateString(cursor);
    results.push({ date: dateKey, count: countsByDate.get(dateKey) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

/**
 * Get the number of users who signed in within the last 7 and 30 days.
 */
export async function getActiveUserStats(
  supabase: TypedClient
): Promise<ActiveUserStats> {
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run both counts in parallel.
  const [result7d, result30d] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in_at", sevenDaysAgo.toISOString()),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in_at", thirtyDaysAgo.toISOString()),
  ]);

  if (result7d.error) throw result7d.error;
  if (result30d.error) throw result30d.error;

  return {
    active7d: result7d.count ?? 0,
    active30d: result30d.count ?? 0,
  };
}

/**
 * Get tournament counts grouped by status.
 *
 * Returns a record mapping each status string to its count
 * (e.g. `{ draft: 5, in_progress: 2, completed: 12 }`).
 */
export async function getTournamentStats(
  supabase: TypedClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, status");

  if (error) throw error;

  const countsByStatus: Record<string, number> = {};
  for (const row of data ?? []) {
    const status = row.status ?? "unknown";
    countsByStatus[status] = (countsByStatus[status] ?? 0) + 1;
  }

  return countsByStatus;
}

/**
 * Get organization counts grouped by status and by tier.
 */
export async function getOrganizationStats(
  supabase: TypedClient
): Promise<OrganizationStats> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, status, tier");

  if (error) throw error;

  const byStatus: Record<string, number> = {};
  const byTier: Record<string, number> = {};

  for (const row of data ?? []) {
    const status = row.status ?? "unknown";
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    const tier = row.tier ?? "unknown";
    byTier[tier] = (byTier[tier] ?? 0) + 1;
  }

  return { byStatus, byTier };
}

/**
 * Get beta-invite conversion metrics.
 *
 * - `totalSent`       — total invites created
 * - `totalUsed`       — invites that have been redeemed (used_at is set)
 * - `totalExpired`    — invites past their expiry that were never used
 * - `conversionRate`  — `totalUsed / totalSent` (0 when none sent)
 */
export async function getInviteConversionStats(
  supabase: TypedClient
): Promise<InviteConversionStats> {
  const now = new Date().toISOString();

  // Total sent — head-only count
  const { count: totalSent, error: sentError } = await supabase
    .from("beta_invites")
    .select("*", { count: "exact", head: true });

  if (sentError) throw sentError;

  // Total used — count where used_at is not null
  const { count: totalUsed, error: usedError } = await supabase
    .from("beta_invites")
    .select("*", { count: "exact", head: true })
    .not("used_at", "is", null);

  if (usedError) throw usedError;

  // Total expired — expires_at < now AND used_at is null
  const { count: totalExpired, error: expiredError } = await supabase
    .from("beta_invites")
    .select("*", { count: "exact", head: true })
    .lt("expires_at", now)
    .is("used_at", null);

  if (expiredError) throw expiredError;

  const sent = totalSent ?? 0;
  const used = totalUsed ?? 0;
  const expired = totalExpired ?? 0;
  const conversionRate = sent > 0 ? used / sent : 0;

  return {
    totalSent: sent,
    totalUsed: used,
    totalExpired: expired,
    conversionRate,
  };
}
