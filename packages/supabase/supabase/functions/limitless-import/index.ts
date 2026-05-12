/**
 * Limitless Import Edge Function (Admin Only)
 *
 * Admin-gated endpoint for managing Limitless tournament data imports.
 *
 * Actions (POST body):
 *   { action: "stats" }
 *     → Returns counts: synced tournaments, fully-imported tournaments, by format
 *
 *   { action: "sync" }
 *     → Stage 1: Fetches tournament list from Limitless API, upserts metadata to DB
 *
 *   { action: "import", tournamentId: "abc123", format: "M-A" }
 *     → Stage 2: Imports full data (standings, teams, matches) for one tournament
 *
 *   { action: "auto-import", tournamentId: "abc123" }
 *     → Auto-detects format and imports (used by webhook)
 *
 * Auth: Requires JWT from a site_admin user, or service role key.
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  LIMITLESS_TO_FORMAT,
  ALL_VALID_FORMATS,
  fetchTournamentData,
  syncTournamentList,
  importTournament,
  type ImportResult,
  type SyncResult,
} from "../_shared/limitless.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Verify the caller is a site admin or using the service role key.
 */
async function requireAdmin(
  req: Request,
  cors: Record<string, string>
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error: "Missing authorization" }, 401, cors);
  }

  const token = authHeader.replace("Bearer ", "");

  // Accept service role key directly (for server-to-server calls like webhooks)
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return { userId: "service_role" };
  }

  const supabaseAdmin = adminClient();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return json(
      { success: false, error: "Invalid or expired token" },
      401,
      cors
    );
  }

  // Check site_admin role
  const { data: adminRole } = await supabaseAdmin
    .from("user_roles")
    .select("role_id, roles!inner(name)")
    .eq("user_id", user.id)
    .eq("roles.name", "site_admin")
    .maybeSingle();

  if (!adminRole) {
    return json({ success: false, error: "Admin access required" }, 403, cors);
  }

  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

/**
 * Returns import stats: synced + fully-imported counts per format.
 *
 * Uses a database function (limitless.tournament_stats) to get accurate
 * GROUP BY counts without hitting PostgREST's row limit.
 */
async function handleStats(cors: Record<string, string>) {
  const supabase = adminClient();

  const { data: rows, error } = await supabase
    .schema("limitless")
    .rpc("tournament_stats");

  if (error) {
    return json({ success: false, error: error.message }, 500, cors);
  }

  // Build reverse lookup for display: formatId → limitlessCode
  const formatToCode: Record<string, string> = {};
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    formatToCode[fmtId] = code;
  }

  let totalSynced = 0;
  let totalImported = 0;

  const formats = (rows ?? []).map(
    (row: { format_id: string; synced: number; imported: number }) => {
      totalSynced += row.synced;
      totalImported += row.imported;
      return {
        limitlessCode: formatToCode[row.format_id] ?? row.format_id,
        formatId: row.format_id,
        synced: row.synced,
        imported: row.imported,
      };
    }
  );

  return json(
    { success: true, data: { totalSynced, totalImported, formats } },
    200,
    cors
  );
}

/**
 * Stage 1: Sync tournament list from Limitless API into DB.
 */
async function handleSync(cors: Record<string, string>) {
  const supabase = adminClient();
  const apiKey = Deno.env.get("LIMITLESS_API_KEY");

  const result: SyncResult = await syncTournamentList(supabase, apiKey);

  console.log(
    `[limitless-import:sync] Synced ${result.synced} tournaments (${result.skipped} skipped, ${result.total} total from API)`
  );

  return json({ success: true, data: result }, 200, cors);
}

/**
 * Stage 2: Import full tournament data (standings, teams, matches).
 */
async function handleImport(
  tournamentId: string,
  format: string,
  cors: Record<string, string>
): Promise<Response> {
  const apiKey = Deno.env.get("LIMITLESS_API_KEY");
  const data = await fetchTournamentData(tournamentId, apiKey);
  const supabase = adminClient();
  const result: ImportResult = await importTournament(supabase, data, format);

  return json({ success: true, data: result }, 200, cors);
}

/**
 * Auto-imports a tournament by ID. Fetches details to determine format,
 * skips if format is unknown/custom. Used by the webhook route.
 */
async function handleAutoImport(
  tournamentId: string,
  cors: Record<string, string>
): Promise<Response> {
  const apiKey = Deno.env.get("LIMITLESS_API_KEY");
  const data = await fetchTournamentData(tournamentId, apiKey);
  const limitlessFormat = data.details.format;

  if (data.details.game !== "VGC") {
    return json(
      {
        success: true,
        data: {
          skipped: true,
          reason: `Non-VGC game: ${data.details.game}`,
          tournamentId,
        },
      },
      200,
      cors
    );
  }

  const supabase = adminClient();
  const result: ImportResult = await importTournament(
    supabase,
    data,
    limitlessFormat
  );

  console.log(
    `[limitless-import:auto] Imported ${tournamentId}: ${result.name} (${result.players} players, ${result.standings} standings)`
  );

  return json({ success: true, data: result }, 200, cors);
}

/**
 * Process the import queue: recover stale entries, then import queued tournaments.
 * Replaces the Vercel cron job at /api/cron/limitless-import.
 */
async function handleProcessQueue(
  batchSize: number,
  cors: Record<string, string>
): Promise<Response> {
  const supabase = adminClient();
  const apiKey = Deno.env.get("LIMITLESS_API_KEY");

  const STALE_IMPORT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const MAX_ATTEMPTS = 3;
  const effectiveBatch = Math.max(1, Math.min(batchSize, 50));

  interface QueueResult {
    processed: boolean;
    recovered?: boolean;
    tournamentId?: string;
    result?: ImportResult;
    error?: string;
  }

  const results: QueueResult[] = [];

  // 1. Recover stale imports (stuck > 10 min)
  const staleThreshold = new Date(Date.now() - STALE_IMPORT_TIMEOUT_MS).toISOString();
  const { data: staleRows, error: staleErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, import_attempts")
    .eq("import_status", "importing")
    .lt("import_started_at", staleThreshold)
    .limit(5);

  if (staleErr) {
    console.error("[limitless-edge] Stale import query failed:", staleErr.message);
  } else if (staleRows && staleRows.length > 0) {
    for (const row of staleRows) {
      const attempts = (row.import_attempts ?? 0) + 1;
      const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
      const { error: updateErr } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_status: newStatus,
          import_error: newStatus === "failed" ? `Timed out after ${MAX_ATTEMPTS} attempts` : null,
          import_attempts: attempts,
        })
        .eq("tournament_id", row.tournament_id);

      if (updateErr) {
        console.error("[limitless-edge] Stale recovery update failed:", updateErr.message);
      }
    }
    results.push({ processed: false, recovered: true });
  }

  // 2. Process up to batchSize tournaments
  let totalProcessed = 0;
  let totalErrors = 0;

  for (let i = 0; i < effectiveBatch; i++) {
    // Pick oldest queued tournament with a known format
    const { data: queued, error: qErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .select("tournament_id, format_id, import_attempts")
      .eq("import_status", "queued")
      .not("format_id", "is", null)
      .neq("format_id", "unknown")
      .order("import_requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue fetch failed: ${qErr.message}`);
    if (!queued) {
      results.push({ processed: false });
      break;
    }

    const { tournament_id: tournamentId, format_id: formatId } = queued;
    const currentAttempts = queued.import_attempts ?? 0;

    // Belt-and-suspenders: if the format still isn't valid, park the row
    if (!formatId || !ALL_VALID_FORMATS.has(formatId)) {
      console.warn(`[limitless-import] Parking ${tournamentId}: unknown format "${formatId}"`);
      await supabase
        .schema("limitless")
        .from("tournaments")
        .update({ import_status: "failed", import_error: `Unknown format: ${formatId}` })
        .eq("tournament_id", tournamentId)
        .eq("import_status", "queued");
      results.push({ processed: false });
      continue;
    }

    // Claim the tournament (optimistic lock)
    const { data: claimed, error: claimErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_status: "importing",
        import_started_at: new Date().toISOString(),
        import_error: null,
      })
      .eq("tournament_id", tournamentId)
      .eq("import_status", "queued")
      .select("tournament_id")
      .maybeSingle();

    if (claimErr) throw new Error(`Failed to claim tournament: ${claimErr.message}`);
    if (!claimed) {
      results.push({ processed: false });
      continue; // Don't break — other tournaments may still be claimable
    }

    // Fetch and import
    try {
      const data = await fetchTournamentData(tournamentId, apiKey);
      const result: ImportResult = await importTournament(supabase, data, formatId);

      // Mark as completed
      const { error: completeErr } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_status: "completed",
          data_imported_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId);

      if (completeErr) {
        console.error(`[limitless-import:queue] Failed to mark ${tournamentId} complete:`, completeErr.message);
      }

      results.push({ processed: true, tournamentId, result });
      totalProcessed++;
      console.log(
        `[limitless-import:queue] Imported ${tournamentId}: ${result.name} (${result.players} players)`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const attempts = currentAttempts + 1;
      const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "queued";

      await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_status: newStatus,
          import_error: errorMsg,
          import_attempts: attempts,
        })
        .eq("tournament_id", tournamentId);

      results.push({ processed: true, tournamentId, error: errorMsg });
      totalProcessed++;
      totalErrors++;
    }
  }

  return json(
    { success: true, data: { batchSize: effectiveBatch, totalProcessed, totalErrors, results } },
    200,
    cors
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, cors);
  }

  try {
    const authResult = await requireAdmin(req, cors);
    if (authResult instanceof Response) return authResult;

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "stats":
        return await handleStats(cors);

      case "sync":
        return await handleSync(cors);

      case "import": {
        const { tournamentId, format } = body;
        if (!tournamentId || typeof tournamentId !== "string") {
          return json(
            { success: false, error: "Missing required field: tournamentId" },
            400,
            cors
          );
        }
        if (!format || typeof format !== "string") {
          return json(
            { success: false, error: "Missing required field: format" },
            400,
            cors
          );
        }
        return await handleImport(tournamentId, format, cors);
      }

      case "auto-import": {
        const { tournamentId } = body;
        if (!tournamentId || typeof tournamentId !== "string") {
          return json(
            { success: false, error: "Missing required field: tournamentId" },
            400,
            cors
          );
        }
        return await handleAutoImport(tournamentId, cors);
      }

      case "process-queue": {
        const batchSize = body.batchSize ?? 5;
        return await handleProcessQueue(batchSize, cors);
      }

      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid: stats, sync, import, auto-import, process-queue`,
          },
          400,
          cors
        );
    }
  } catch (error) {
    console.error("[limitless-import]", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500,
      cors
    );
  }
});
