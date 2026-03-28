"use server";

import { positiveIntSchema, adminReasonSchema } from "@trainers/validators";
import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import {
  approveCommunityRequest,
  rejectCommunityRequest,
} from "@trainers/supabase/mutations";

// --- Approve ---

export async function approveOrgRequestAction(
  requestId: number
): Promise<ActionResult> {
  const parsed = positiveIntSchema.safeParse(requestId);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await approveCommunityRequest(supabase, parsed.data, adminUserId);

    // Fire-and-forget email notification
    supabase.functions
      .invoke("send-org-request-notification", {
        body: { requestId: parsed.data, action: "approved" },
      })
      .catch((err: unknown) =>
        console.error("Failed to send approval email:", err)
      );

    return { success: true };
  }, "Failed to approve organization request");
}

// --- Reject ---

export async function rejectOrgRequestAction(
  requestId: number,
  reason: string
): Promise<ActionResult> {
  const parsedId = positiveIntSchema.safeParse(requestId);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedReason = adminReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await rejectCommunityRequest(
      supabase,
      parsedId.data,
      adminUserId,
      parsedReason.data
    );

    // Fire-and-forget email notification
    supabase.functions
      .invoke("send-org-request-notification", {
        body: { requestId: parsedId.data, action: "rejected" },
      })
      .catch((err: unknown) =>
        console.error("Failed to send rejection email:", err)
      );

    return { success: true };
  }, "Failed to reject organization request");
}
