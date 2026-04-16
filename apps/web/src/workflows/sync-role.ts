// apps/web/src/workflows/sync-role.ts
import { FatalError } from "workflow";
import { toggleRoleMapping } from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { assignDiscordRole, removeDiscordRole } from "./steps/discord-api";
import { logDeliveryFailure } from "./steps/failure-tracking";

/**
 * Disable a role mapping when the Discord role no longer exists.
 * Queries discord_role_mappings by (discord_server_id, discord_role_id)
 * and calls toggleRoleMapping to set enabled = false.
 */
async function disableRoleMapping(serverId: number, roleId: string) {
  "use step";
  console.log("[sync-role:disableRoleMapping] disabling mapping", {
    serverId,
    roleId,
  });
  const supabase = createServiceRoleClient();
  const { data: mapping } = await supabase
    .from("discord_role_mappings")
    .select("id")
    .eq("discord_server_id", serverId)
    .eq("discord_role_id", roleId)
    .maybeSingle();
  if (mapping) {
    await toggleRoleMapping(supabase, mapping.id, false);
    console.log("[sync-role:disableRoleMapping] mapping disabled", {
      mappingId: mapping.id,
    });
  } else {
    console.log("[sync-role:disableRoleMapping] no mapping found, skipping", {
      serverId,
      roleId,
    });
  }
}

/**
 * Durable workflow: sync a Discord role assignment for a user.
 *
 * - Retries on transient errors (rate limits, 5xx).
 * - On role_deleted: disables the mapping and logs a failure.
 * - On hierarchy_violation or user_left: logs failure only, mapping stays active.
 */
export async function syncRoleWorkflow(
  guildId: string,
  discordUserId: string,
  roleId: string,
  action: "add" | "remove",
  serverId: number,
  roleType: string
) {
  "use workflow";

  console.log("[sync-role] started", {
    guildId,
    discordUserId,
    roleId,
    action,
    serverId,
    roleType,
  });

  try {
    if (action === "add") {
      await assignDiscordRole(guildId, discordUserId, roleId);
    } else {
      await removeDiscordRole(guildId, discordUserId, roleId);
    }
    console.log("[sync-role] synced successfully", {
      guildId,
      discordUserId,
      roleId,
      action,
    });
    return { status: "synced" as const };
  } catch (e) {
    if (e instanceof FatalError) {
      const reason = e.message; // "hierarchy_violation", "role_deleted", "user_left"
      console.log("[sync-role] fatal error, handling", {
        reason,
        discordUserId,
        roleId,
      });

      // role_deleted: the role no longer exists — disable the mapping so no
      // future syncs are attempted against a deleted role.
      if (reason === "role_deleted") {
        await disableRoleMapping(serverId, roleId);
      }
      // hierarchy_violation / user_left: log only, do NOT disable mapping.

      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "role_sync",
        event_type: roleType,
        target: roleId,
        error_reason: reason,
      });

      return { status: "failed" as const, reason };
    }
    throw e; // re-throw RetryableError for the runtime to handle
  }
}
