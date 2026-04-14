/**
 * Shared helper — require the Discord user to have a linked trainers.gg account.
 *
 * Returns `{ ok: true, userId }` when the account is linked, or
 * `{ ok: false, message }` with a user-friendly prompt to run /link.
 */

import { getUserByDiscordId, type TypedClient } from "@trainers/supabase";

export type RequireLinkedAccountResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Resolve a Discord user ID to a trainers.gg user ID.
 *
 * @param supabase       - Service-role Supabase client (auth.identities access)
 * @param discordUserId  - Discord snowflake user ID
 */
export async function requireLinkedAccount(
  supabase: TypedClient,
  discordUserId: string
): Promise<RequireLinkedAccountResult> {
  const linked = await getUserByDiscordId(supabase, discordUserId);
  if (!linked) {
    return {
      ok: false,
      message:
        "Your Discord account isn't linked to a trainers.gg account yet. Run `/link` to connect them.",
    };
  }
  return { ok: true, userId: linked.user_id };
}
