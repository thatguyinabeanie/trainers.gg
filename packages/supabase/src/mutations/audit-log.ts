/**
 * Audit log write helpers.
 *
 * All functions in this file require a `ServiceRoleClient` — the `audit_log`
 * table has RLS enabled with deny-by-default (no INSERT policy for authenticated
 * users). Passing an anon/session client is a compile-time type error, which
 * prevents silent insert failures caused by RLS blocking the write.
 *
 * Errors are thrown (not swallowed) so callers see failures rather than silently
 * losing audit records.
 */

import { type TablesInsert } from "../types";
import { type ServiceRoleClient } from "../client";

/** Payload for a single audit log row. */
export type AuditLogInsert = TablesInsert<"audit_log">;

/**
 * Insert a single row into `audit_log`.
 *
 * @param supabase - Service-role client (compile-time enforced).
 * @param payload  - Row data matching `audit_log` insert shape.
 * @throws {Error} When the insert fails (RLS denial or DB error).
 */
export async function writeAuditLog(
  supabase: ServiceRoleClient,
  payload: AuditLogInsert
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(payload);

  if (error) {
    throw new Error(
      `audit_log insert failed [action=${String(payload.action)}]: ${error.message}`
    );
  }
}
