import type { TypedClient } from "../client";

/**
 * List announcements, ordered by created_at descending.
 * Optionally filter by status: active, scheduled, or expired.
 *
 * - active: is_active AND start_at <= now AND (end_at IS NULL OR end_at > now)
 * - scheduled: is_active AND start_at > now
 * - expired: NOT is_active OR end_at <= now
 *
 * @param supabase - Typed Supabase client
 * @param options - Optional status filter
 */
export async function listAnnouncements(
  supabase: TypedClient,
  options?: { status?: "active" | "scheduled" | "expired" }
) {
  const now = new Date().toISOString();

  let query = supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status === "active") {
    // Currently visible: is_active, started, and not yet expired
    query = query
      .eq("is_active", true)
      .lte("start_at", now)
      .or(`end_at.is.null,end_at.gt.${now}`);
  } else if (options?.status === "scheduled") {
    // Scheduled for the future: is_active but hasn't started yet
    query = query.eq("is_active", true).gt("start_at", now);
  } else if (options?.status === "expired") {
    // Expired: either deactivated or past end_at
    query = query.or(`is_active.eq.false,end_at.lte.${now}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get currently visible announcements for display to users.
 * Returns announcements that are active and within their schedule window,
 * ordered by most recently created first.
 *
 * @param supabase - Typed Supabase client
 */
export async function getActiveAnnouncements(supabase: TypedClient) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .lte("start_at", now)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new announcement.
 * Inserts an audit log entry with action 'admin.announcement_created'.
 *
 * @param supabase - Typed Supabase client
 * @param data - Announcement data to insert
 * @param adminUserId - ID of the admin performing the action
 */
export async function createAnnouncement(
  supabase: TypedClient,
  data: {
    title: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    start_at?: string;
    end_at?: string;
    is_active?: boolean;
  },
  adminUserId: string
) {
  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      title: data.title,
      message: data.message,
      type: data.type,
      start_at: data.start_at ?? new Date().toISOString(),
      end_at: data.end_at ?? null,
      is_active: data.is_active ?? true,
      created_by: adminUserId,
    })
    .select()
    .single();

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.announcement_created",
    actor_user_id: adminUserId,
    metadata: {
      announcement_id: announcement.id,
      title: announcement.title,
      type: announcement.type,
    },
  });

  if (auditError) {
    console.error(
      "Failed to log announcement_created to audit log:",
      auditError
    );
  }

  return announcement;
}

/**
 * Update an existing announcement.
 * Sets updated_at to the current timestamp and inserts an audit log entry
 * with action 'admin.announcement_updated'.
 *
 * @param supabase - Typed Supabase client
 * @param id - Announcement ID
 * @param data - Fields to update
 * @param adminUserId - ID of the admin performing the action
 */
export async function updateAnnouncement(
  supabase: TypedClient,
  id: number,
  data: {
    title?: string;
    message?: string;
    type?: "info" | "warning" | "error" | "success";
    start_at?: string;
    end_at?: string | null;
    is_active?: boolean;
  },
  adminUserId: string
) {
  const { data: announcement, error } = await supabase
    .from("announcements")
    .update({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.message !== undefined && { message: data.message }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.start_at !== undefined && { start_at: data.start_at }),
      ...(data.end_at !== undefined && { end_at: data.end_at }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.announcement_updated",
    actor_user_id: adminUserId,
    metadata: {
      announcement_id: announcement.id,
      title: announcement.title,
      updated_fields: Object.keys(data),
    },
  });

  if (auditError) {
    console.error(
      "Failed to log announcement_updated to audit log:",
      auditError
    );
  }

  return announcement;
}

/**
 * Delete an announcement.
 * Inserts an audit log entry with action 'admin.announcement_deleted'.
 *
 * @param supabase - Typed Supabase client
 * @param id - Announcement ID
 * @param adminUserId - ID of the admin performing the action
 */
export async function deleteAnnouncement(
  supabase: TypedClient,
  id: number,
  adminUserId: string
) {
  // Fetch the announcement before deletion so we can record its title in the audit log
  const { data: existing, error: fetchError } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) throw error;

  // Audit log
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.announcement_deleted",
    actor_user_id: adminUserId,
    metadata: {
      announcement_id: existing.id,
      title: existing.title,
    },
  });

  if (auditError) {
    console.error(
      "Failed to log announcement_deleted to audit log:",
      auditError
    );
  }
}
