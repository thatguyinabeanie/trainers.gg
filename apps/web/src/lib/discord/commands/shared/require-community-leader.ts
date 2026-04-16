/**
 * Shared helper — require the Discord user to be a community leader.
 *
 * Steps:
 * 1. Resolve Discord user → trainers.gg user via `requireLinkedAccount`
 * 2. Verify the user is the community owner OR in community_staff
 *
 * Returns `{ ok: true, userId }` or `{ ok: false, message }`.
 */

import { hasCommunityAccess, type TypedClient } from "@trainers/supabase";

import { requireLinkedAccount } from "./require-linked-account";

export type RequireCommunityLeaderResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Verify the Discord user is a community leader (owner or staff).
 *
 * @param supabase       - Service-role Supabase client
 * @param discordUserId  - Discord snowflake user ID
 * @param communityId    - Community to check access for
 * @param communityName  - Community name for error messages
 */
export async function requireCommunityLeader(
  supabase: TypedClient,
  discordUserId: string,
  communityId: number,
  communityName: string
): Promise<RequireCommunityLeaderResult> {
  const linked = await requireLinkedAccount(supabase, discordUserId);
  if (!linked.ok) return linked;

  const isLeader = await hasCommunityAccess(
    supabase,
    communityId,
    linked.userId
  );
  if (!isLeader) {
    return {
      ok: false,
      message: `You need to be a community leader for **${communityName}** to use this command.`,
    };
  }

  return { ok: true, userId: linked.userId };
}
