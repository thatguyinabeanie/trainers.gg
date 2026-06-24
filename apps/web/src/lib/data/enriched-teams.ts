import {
  getEnrichedTeamsForUser,
  type TypedClient,
} from "@trainers/supabase";

import { type EnrichedAccountTeam } from "@/components/team-builder/persistence/account-team-record";

/**
 * Fetch the user's account teams and map them into the landing's
 * EnrichedAccountTeam contract (strips the alt-join fields off `team`,
 * lifts flags to the top level, prefixes folder ids as `dbfolder-<id>`).
 * P-bucket: pass an authenticated client (SSR createClientReadOnly or the
 * browser client) — RLS scopes the read to the user's alts.
 */
export async function fetchEnrichedAccountTeams(
  supabase: TypedClient,
  userId: string
): Promise<EnrichedAccountTeam[]> {
  const rows = await getEnrichedTeamsForUser(supabase, userId);
  return rows.map((row) => {
    const { alt_username, alt_id, folder_ids, ...team } = row;
    return {
      team,
      pinned: team.pinned,
      archived: team.archived,
      sortOrder: team.sort_order,
      folderIds: folder_ids.map((id) => `dbfolder-${id}`),
      altUsername: alt_username,
      altId: alt_id,
      createdAt: team.created_at ?? team.updated_at ?? "",
      updatedAt: team.updated_at ?? team.created_at ?? "",
    };
  });
}
