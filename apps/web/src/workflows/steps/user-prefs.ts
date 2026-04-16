import { isDmEnabledForUser } from "@trainers/supabase";
import { type DiscordDmEventType } from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Check whether DMs are enabled for a user for a given event type.
 * Returns false when no preference row exists (opt-in model: disabled by default).
 */
export async function checkDmPreference(
  userId: string,
  eventType: DiscordDmEventType
): Promise<boolean> {
  "use step";
  console.log("[step:checkDmPreference] checking DM preference", {
    userId,
    eventType,
  });
  const supabase = createServiceRoleClient();
  return isDmEnabledForUser(supabase, userId, eventType);
}

/**
 * Set the discord_dm_warn_until flag on a user.
 * Called when a 50007 error (DMs closed) is encountered so the UI can warn the user.
 * The flag expires after 30 days.
 */
export async function setDmWarnFlag(userId: string) {
  "use step";
  console.log("[step:setDmWarnFlag] setting DM warn flag", { userId });
  const supabase = createServiceRoleClient();
  const warnUntil = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  await supabase
    .from("users")
    .update({ discord_dm_warn_until: warnUntil })
    .eq("id", userId);
}

/**
 * Clear the discord_dm_warn_until flag on a user.
 * Called after a successful DM delivery so the UI warning is removed.
 * No-ops (via `.not()` filter) if the flag is already null.
 */
export async function clearDmWarnFlag(userId: string) {
  "use step";
  console.log("[step:clearDmWarnFlag] clearing DM warn flag", { userId });
  const supabase = createServiceRoleClient();
  await supabase
    .from("users")
    .update({ discord_dm_warn_until: null })
    .eq("id", userId)
    .not("discord_dm_warn_until", "is", null);
}
