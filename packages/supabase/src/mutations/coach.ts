import { type CoachProfileInput } from "@trainers/validators";

import { type Json } from "../types";
import { type ServiceRoleClient, type TypedClient } from "../client";
import { writeAuditLog } from "./audit-log";

/**
 * Admin: grant coach status (service-role client; bypasses RLS).
 *
 * Requires `ServiceRoleClient` so that the `audit_log` insert is guaranteed to
 * succeed at the RLS level. Passing an anon/session client is a compile error.
 */
export async function grantCoachStatus(
  supabase: ServiceRoleClient,
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

  await writeAuditLog(supabase, {
    action: "admin.coach_granted" as const,
    actor_user_id: adminUserId,
    metadata: { target_user_id: userId } as unknown as Json,
  });
}

/**
 * Admin: revoke coach status. Retains the coach_profiles row (hidden via is_coach).
 *
 * Requires `ServiceRoleClient` so that the `audit_log` insert is guaranteed to
 * succeed at the RLS level. Passing an anon/session client is a compile error.
 */
export async function revokeCoachStatus(
  supabase: ServiceRoleClient,
  userId: string,
  adminUserId: string,
  reason?: string
) {
  const { error: userError } = await supabase
    .from("users")
    .update({ is_coach: false })
    .eq("id", userId);
  if (userError) throw userError;

  await writeAuditLog(supabase, {
    action: "admin.coach_revoked" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      ...(reason && { reason }),
    } as unknown as Json,
  });
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
      .upsert(
        {
          user_id: userId,
          headline: input.headline,
          bio: input.bio,
          formats: input.formats,
          links: input.links as unknown as Json,
          service_types: input.serviceTypes,
          // updated_at is set by the `set_coach_profiles_updated_at` DB
          // trigger — writing it from app time would race with that trigger
          // and introduce clock-skew inconsistencies across app servers.
        },
        { onConflict: "user_id" }
      );
  if (error) throw error;
}
