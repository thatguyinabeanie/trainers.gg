/**
 * Tournament Registration API Route
 */

import { type NextRequest, NextResponse } from "next/server";
import { registerForTournament } from "@trainers/supabase/server";
import {
  positiveIntSchema,
  tournamentRegistrationSchema,
  ZodError,
  type ActionResult,
} from "@trainers/validators";

/**
 * POST /api/tournaments/:id/register
 * Register for a tournament
 *
 * Note: In Next.js 15+, route segment params are async.
 * See: https://nextjs.org/docs/messages/sync-dynamic-apis
 */
export async function POST(
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
    const { altId } = tournamentRegistrationSchema.parse(body);

    await registerForTournament(tournamentId, { altId });

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
        error instanceof Error
          ? error.message
          : "Failed to register for tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
