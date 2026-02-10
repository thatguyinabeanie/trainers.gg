import type { Json } from "../types";
import type { TypedClient } from "../client";

/**
 * List all feature flags, ordered alphabetically by key.
 *
 * @param supabase - Typed Supabase client
 */
export async function listFeatureFlags(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("key", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get a single feature flag by its unique key.
 * Returns null if the flag does not exist.
 *
 * @param supabase - Typed Supabase client
 * @param key - Unique flag identifier (e.g., "maintenance_mode")
 */
export async function getFeatureFlag(supabase: TypedClient, key: string) {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Check whether a feature flag is enabled.
 * Returns false if the flag does not exist.
 *
 * @param supabase - Typed Supabase client
 * @param key - Unique flag identifier
 */
export async function isFeatureEnabled(
  supabase: TypedClient,
  key: string
): Promise<boolean> {
  const flag = await getFeatureFlag(supabase, key);
  return flag?.enabled ?? false;
}

/**
 * Create a new feature flag.
 * Inserts an audit log entry with action 'admin.flag_created'.
 *
 * @param supabase - Typed Supabase client
 * @param data - Flag data to insert
 * @param adminUserId - ID of the admin performing the action
 */
export async function createFeatureFlag(
  supabase: TypedClient,
  data: {
    key: string;
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  },
  adminUserId: string
) {
  const { data: flag, error } = await supabase
    .from("feature_flags")
    .insert({
      key: data.key,
      description: data.description ?? null,
      enabled: data.enabled ?? false,
      metadata: data.metadata ?? {},
      created_by: adminUserId,
    })
    .select()
    .single();

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.flag_created",
    actor_user_id: adminUserId,
    metadata: {
      flag_id: flag.id,
      flag_key: flag.key,
      enabled: flag.enabled,
    },
  });

  if (auditError) {
    console.error("Failed to log flag_created to audit log:", auditError);
  }

  return flag;
}

/**
 * Update an existing feature flag.
 * Sets updated_at to the current timestamp and inserts an audit log entry
 * with action 'admin.flag_toggled' (includes old and new enabled state).
 *
 * @param supabase - Typed Supabase client
 * @param id - Feature flag ID
 * @param data - Fields to update
 * @param adminUserId - ID of the admin performing the action
 */
export async function updateFeatureFlag(
  supabase: TypedClient,
  id: number,
  data: {
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  },
  adminUserId: string
) {
  // Fetch the current flag so we can record old values in the audit log
  const { data: existing, error: fetchError } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { data: flag, error } = await supabase
    .from("feature_flags")
    .update({
      ...(data.description !== undefined && { description: data.description }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.metadata !== undefined && {
        metadata: data.metadata,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.flag_toggled",
    actor_user_id: adminUserId,
    metadata: {
      flag_id: flag.id,
      flag_key: flag.key,
      old_enabled: existing.enabled,
      new_enabled: flag.enabled,
    },
  });

  if (auditError) {
    console.error("Failed to log flag_toggled to audit log:", auditError);
  }

  return flag;
}

/**
 * Delete a feature flag.
 * Inserts an audit log entry with action 'admin.flag_deleted'.
 *
 * @param supabase - Typed Supabase client
 * @param id - Feature flag ID
 * @param adminUserId - ID of the admin performing the action
 */
export async function deleteFeatureFlag(
  supabase: TypedClient,
  id: number,
  adminUserId: string
) {
  // Fetch the flag before deletion so we can record its key in the audit log
  const { data: existing, error: fetchError } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase.from("feature_flags").delete().eq("id", id);

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.flag_deleted",
    actor_user_id: adminUserId,
    metadata: {
      flag_id: existing.id,
      flag_key: existing.key,
    },
  });

  if (auditError) {
    console.error("Failed to log flag_deleted to audit log:", auditError);
  }
}
