/**
 * Tournament Detail API Routes
 *
 * RESTful endpoints for specific tournament operations.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getTournamentById, updateTournament } from "@trainers/supabase/server";
import {
  positiveIntSchema,
  updateTournamentSchema,
  ZodError,
  type ActionResult,
} from "@trainers/validators";

/**
 * GET /api/tournaments/:id
 * Get tournament details by ID
 *
 * Note: In Next.js 15+, route segment params are async.
 * See: https://nextjs.org/docs/messages/sync-dynamic-apis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    // This route uses cookie-based Supabase auth via @trainers/supabase/server.
    // If a mobile/external client sends a Bearer token, we currently cannot
    // bind that token to the Supabase client here, so reject explicitly instead
    // of silently treating the request as anonymous.
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const result: ActionResult = {
        success: false,
        error:
          "Bearer token authentication is not supported on this route. " +
          "Please use the dedicated Edge Function endpoint: /functions/v1/api-tournaments",
      };

      return NextResponse.json(result, { status: 401 });
    }

    const { id } = await params;
    const tournamentId = positiveIntSchema.parse(id);

    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      const result: ActionResult = {
        success: false,
        error: "Tournament not found",
      };
      return NextResponse.json(result, { status: 404 });
    }

    const result: ActionResult<typeof tournament> = {
      success: true,
      data: tournament,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const result: ActionResult = {
        success: false,
        error: "Invalid tournament ID",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * PATCH /api/tournaments/:id
 * Update tournament details
 *
 * Note: In Next.js 15+, route segment params are async.
 * See: https://nextjs.org/docs/messages/sync-dynamic-apis
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    // This route uses cookie-based Supabase auth via @trainers/supabase/server.
    // If a mobile/external client sends a Bearer token, we currently cannot
    // bind that token to the Supabase client here, so reject explicitly instead
    // of silently treating the request as anonymous.
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const result: ActionResult = {
        success: false,
        error:
          "Bearer token authentication is not supported on this route. " +
          "Please use the dedicated Edge Function endpoint: /functions/v1/api-tournaments",
      };

      return NextResponse.json(result, { status: 401 });
    }

    const { id } = await params;
    const tournamentId = positiveIntSchema.parse(id);

    const body = await request.json();
    const parsed = updateTournamentSchema.parse(body);
    await updateTournament(tournamentId, parsed);

    const result: ActionResult<{ success: true }> = {
      success: true,
      data: { success: true },
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const result: ActionResult = {
        success: false,
        error: error.issues[0]?.message ?? "Invalid input",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
