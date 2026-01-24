/**
 * Link AT Protocol Account Route
 *
 * Links a Bluesky DID to the currently authenticated user's account.
 * POST /api/oauth/link
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { did } = await request.json();

    if (!did || typeof did !== "string") {
      return NextResponse.json(
        { success: false, error: "DID is required" },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const supabase = await createClient();
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
    // Note: Type assertion used until types are regenerated after migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("users")
      .update({
        did,
        pds_status: "active",
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
