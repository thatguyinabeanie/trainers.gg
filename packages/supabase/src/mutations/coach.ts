import { type CoachProfileInput } from "@trainers/validators";

import { type Json } from "../types";
import { type TypedClient } from "../client";

/** Admin: grant coach status (service-role client; bypasses RLS). */
export async function grantCoachStatus(
  supabase: TypedClient,
  userId: string,
  adminUserId: string
) {
  const { error: userError } = await supabase
    .from("users")
    .update({ is_coach: true })
    .eq("id", userId);
  if (userError) throw userError;

  const { error: profileError } = await supabase
    .from("coach_profiles")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (profileError) throw profileError;

  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.coach_granted" as const,
    actor_user_id: adminUserId,
    metadata: { target_user_id: userId } as unknown as Json,
  });
  if (auditError)
    console.error("Failed to log coach grant", { userId, auditError });
}

/** Admin: revoke coach status. Retains the coach_profiles row (hidden via is_coach). */
export async function revokeCoachStatus(
  supabase: TypedClient,
  userId: string,
  adminUserId: string,
  reason?: string
) {
  const { error: userError } = await supabase
    .from("users")
    .update({ is_coach: false })
    .eq("id", userId);
  if (userError) throw userError;

  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.coach_revoked" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      ...(reason && { reason }),
    } as unknown as Json,
  });
  if (auditError)
    console.error("Failed to log coach revoke", { userId, auditError });
}

/**
 * Coach edits their own profile. `supabase` MUST be the user-scoped client so
 * the RLS UPDATE policy (user_id = auth.uid()) enforces ownership.
 */
export async function updateCoachProfile(
  supabase: TypedClient,
  userId: string,
  input: CoachProfileInput
) {
  const { error } = await supabase
    .from("coach_profiles")
    .update({
      headline: input.headline,
      bio: input.bio,
      formats: input.formats,
      links: input.links as unknown as Json,
      service_types: input.serviceTypes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw error;
}
