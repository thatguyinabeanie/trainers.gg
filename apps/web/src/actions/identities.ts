"use server";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@trainers/validators";
import { withAction } from "./utils";

/**
 * Get the current user's Bluesky DID status
 * Returns the DID if the user has a linked Bluesky account (either trainers.gg PDS or external)
 */
export async function getBlueskyStatus(): Promise<
  ActionResult<{
    did: string | null;
    pdsStatus: string | null;
    handle: string | null;
  }>
> {
  return withAction(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data } = await supabase
      .from("users")
      .select("did, pds_status, pds_handle")
      .eq("id", user.id)
      .maybeSingle();

    return {
      did: data?.did || null,
      pdsStatus: data?.pds_status || null,
      handle: data?.pds_handle || null,
    };
  }, "Failed to get Bluesky status");
}

/**
 * Unlink Bluesky account (set DID and pds_status to null)
 * Includes lockout protection - prevents unlinking if it's the last authentication method
 */
export async function unlinkBlueskyAction(): Promise<ActionResult<void>> {
  return withAction(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check total linked methods (lockout protection)
    const identitiesCount = user.identities?.length || 0;
    const { data: userData } = await supabase
      .from("users")
      .select("did")
      .eq("id", user.id)
      .maybeSingle();

    const hasBluesky = !!userData?.did;
    const totalMethods = identitiesCount + (hasBluesky ? 1 : 0);

    if (totalMethods <= 1) {
      throw new Error("You must have at least one authentication method");
    }

    // Unlink Bluesky by clearing DID and PDS fields
    const { error } = await supabase
      .from("users")
      .update({ did: null, pds_status: null, pds_handle: null })
      .eq("id", user.id);

    if (error) {
      throw new Error(`Failed to unlink Bluesky: ${error.message}`);
    }
  }, "Failed to unlink Bluesky account");
}
