/**
 * Tournament API Routes
 *
 * RESTful endpoints for mobile app (and future external clients).
 * Uses auto-generated server wrappers from @trainers/supabase/server.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  listTournamentsGrouped,
  createTournament,
} from "@trainers/supabase/server";
import {
  createTournamentSchema,
  ZodError,
  type ActionResult,
} from "@trainers/validators";

/**
 * GET /api/tournaments
 * List all tournaments grouped by status (active, upcoming, completed)
 */
export async function GET(request: NextRequest) {
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

    const tournaments = await listTournamentsGrouped({ completedLimit: 10 });

    const result: ActionResult<typeof tournaments> = {
      success: true,
      data: tournaments,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list tournaments",
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * POST /api/tournaments
 * Create a new tournament
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    // Validate name/slug/description via shared schema; pass full body to create
    createTournamentSchema.parse(body);
    const tournament = await createTournament(body);

    const result: ActionResult<typeof tournament> = {
      success: true,
      data: tournament,
    };

    return NextResponse.json(result, { status: 201 });
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
        error instanceof Error ? error.message : "Failed to create tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
