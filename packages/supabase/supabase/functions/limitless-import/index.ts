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
 * Uses two targeted count queries instead of fetching all rows, since
 * PostgREST defaults to a 1000-row limit on SELECT.
 */
async function handleStats(cors: Record<string, string>) {
  const supabase = adminClient();

  // Get distinct format_ids present in the table
  const { data: allRows, error: allErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("format_id, data_imported_at")
    .limit(50000);

  if (allErr) {
    return json({ success: false, error: allErr.message }, 500, cors);
  }

  // Count by format: synced (all rows) vs fully imported (data_imported_at != null)
  const byFormat: Record<string, { synced: number; imported: number }> = {};
  for (const row of allRows ?? []) {
    const entry = byFormat[row.format_id] ?? { synced: 0, imported: 0 };
    entry.synced++;
    if (row.data_imported_at) entry.imported++;
    byFormat[row.format_id] = entry;
  }

  // Build reverse lookup for display: formatId → limitlessCode
  const formatToCode: Record<string, string> = {};
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    formatToCode[fmtId] = code;
  }

  // Include ALL formats found in DB, not just mapped ones
  const formats = Object.entries(byFormat)
    .map(([formatId, counts]) => ({
      limitlessCode: formatToCode[formatId] ?? formatId,
      formatId,
      synced: counts.synced,
      imported: counts.imported,
    }))
    .sort((a, b) => b.synced - a.synced);

  const totalSynced = allRows?.length ?? 0;
  const totalImported = (allRows ?? []).filter(
    (r) => r.data_imported_at
  ).length;

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

      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid: stats, sync, import, auto-import`,
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
