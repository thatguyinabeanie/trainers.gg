/**
 * Limitless Import Edge Function (Admin Only)
 *
 * Admin-gated endpoint for managing Limitless tournament data imports.
 *
 * Actions (POST body):
 *   { action: "stats" }
 *     → Returns import counts by format (how many imported vs available)
 *
 *   { action: "list", format: "M-A" }
 *     → Fetches available tournaments from Limitless API for a format,
 *       annotates each with whether it's already imported
 *
 *   { action: "import", tournamentId: "abc123", format: "M-A" }
 *     → Imports a single tournament from Limitless API into the DB
 *
 * Auth: Requires JWT from a site_admin user.
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  LIMITLESS_TO_FORMAT,
  KNOWN_FORMATS,
  fetchTournamentList,
  fetchTournamentData,
  importTournament,
  type ImportResult,
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

/**
 * Verify the caller is a site admin or using the service role key.
 * Returns the caller identity on success, or a Response on failure.
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the JWT and get the user
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

  // Check site_admin role via user_roles + roles
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
 * Returns import stats: count of imported tournaments per format,
 * plus total available (from the tournaments already in DB).
 */
async function handleStats(cors: Record<string, string>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Count imported tournaments grouped by format_id
  const { data: rows, error } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("format_id");

  if (error) {
    return json({ success: false, error: error.message }, 500, cors);
  }

  // Build counts by format
  const importedByFormat: Record<string, number> = {};
  for (const row of rows ?? []) {
    importedByFormat[row.format_id] =
      (importedByFormat[row.format_id] ?? 0) + 1;
  }

  // Build the response with all known formats
  const formats = Object.entries(LIMITLESS_TO_FORMAT).map(
    ([limitlessCode, formatId]) => ({
      limitlessCode,
      formatId,
      imported: importedByFormat[formatId] ?? 0,
    })
  );

  const totalImported = rows?.length ?? 0;

  return json({ success: true, data: { totalImported, formats } }, 200, cors);
}

/**
 * Lists available tournaments from Limitless API for a given format,
 * annotated with import status from our DB.
 */
async function handleList(format: string, cors: Record<string, string>) {
  if (!KNOWN_FORMATS.has(format)) {
    return json(
      {
        success: false,
        error: `Unknown format: ${format}. Known: ${[...KNOWN_FORMATS].join(", ")}`,
      },
      400,
      cors
    );
  }

  const apiKey = Deno.env.get("LIMITLESS_API_KEY");

  // Fetch all VGC tournaments from Limitless
  const allTournaments = await fetchTournamentList(apiKey);

  // Filter to the requested format
  const formatTournaments = allTournaments.filter((t) => t.format === format);

  // Check which ones are already imported
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tournamentIds = formatTournaments.map((t) => t.id);
  const { data: imported } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, imported_at")
    .in("tournament_id", tournamentIds);

  const importedMap = new Map(
    (imported ?? []).map((r) => [r.tournament_id, r.imported_at])
  );

  // Annotate each tournament
  const annotated = formatTournaments.map((t) => ({
    id: t.id,
    name: t.name,
    date: t.date,
    players: t.players,
    imported: importedMap.has(t.id),
    importedAt: importedMap.get(t.id) ?? null,
  }));

  // Sort by date descending (newest first)
  annotated.sort((a, b) => b.date.localeCompare(a.date));

  return json(
    {
      success: true,
      data: {
        format,
        formatId: LIMITLESS_TO_FORMAT[format],
        total: annotated.length,
        imported: annotated.filter((t) => t.imported).length,
        tournaments: annotated,
      },
    },
    200,
    cors
  );
}

/**
 * Imports a single tournament from Limitless API into the DB.
 */
async function handleImport(
  tournamentId: string,
  format: string,
  cors: Record<string, string>
): Promise<Response> {
  if (!KNOWN_FORMATS.has(format)) {
    return json(
      { success: false, error: `Unknown format: ${format}` },
      400,
      cors
    );
  }

  const apiKey = Deno.env.get("LIMITLESS_API_KEY");

  // Fetch tournament data from Limitless API
  const data = await fetchTournamentData(tournamentId, apiKey);

  // Import into DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // Fetch tournament data from Limitless API
  const data = await fetchTournamentData(tournamentId, apiKey);
  const limitlessFormat = data.details.format;

  // Skip unknown/custom formats
  if (!KNOWN_FORMATS.has(limitlessFormat)) {
    return json(
      {
        success: true,
        data: {
          skipped: true,
          reason: `Unknown format: ${limitlessFormat}`,
          tournamentId,
        },
      },
      200,
      cors
    );
  }

  // Only process VGC
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

  // Import into DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, cors);
  }

  try {
    // Verify admin access
    const authResult = await requireAdmin(req, cors);
    if (authResult instanceof Response) return authResult;

    // Parse request body
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "stats":
        return await handleStats(cors);

      case "list": {
        const { format } = body;
        if (!format || typeof format !== "string") {
          return json(
            { success: false, error: "Missing required field: format" },
            400,
            cors
          );
        }
        return await handleList(format, cors);
      }

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
            error: `Unknown action: ${action}. Valid: stats, list, import, auto-import`,
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
