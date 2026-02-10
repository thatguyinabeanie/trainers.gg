/**
 * Link AT Protocol Account Route
 *
 * Links a Bluesky DID to the currently authenticated user's account.
 * POST /api/oauth/link
 */

import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAtprotoClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  }

  try {
    const { did } = await request.json();

    if (!did || typeof did !== "string") {
      return NextResponse.json(
        { success: false, error: "DID is required" },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const supabase = await createAtprotoClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if this DID is already linked to another user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("did", did)
      .maybeSingle();

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "This Bluesky account is already linked to another user",
        },
        { status: 409 }
      );
    }

    // Link the DID to the current user
    // Note: We only update the DID here. The pds_status transitions are handled
    // by the PDS edge function to ensure proper account lifecycle management.
    const { error: updateError } = await supabase
      .from("users")
      .update({
        did,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to link DID:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to link Bluesky account" },
        { status: 500 }
      );
    }

    // Clear the atproto_did cookie
    const cookieStore = await cookies();
    cookieStore.delete("atproto_did");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
