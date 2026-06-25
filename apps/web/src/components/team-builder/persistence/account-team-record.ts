/**
 * account-team-record.ts
 *
 * Pure mappers bridging DB-backed account teams into the canonical
 * LocalDraftRecord shape consumed by the landing pipeline (predicate-eval,
 * group-drafts, team-row). Framework-free — no React, no Supabase client.
 */

import { type TeamWithPokemon } from "@trainers/supabase";

import { type LocalDraftRecord } from "./local-drafts-types";

/**
 * A single enriched account team, normalized for the landing.
 * This is the client-side contract the enriched fetcher (lib/data/enriched-teams.ts)
 * produces from getEnrichedTeamsForUser — deliberately decoupled from the exact
 * Supabase row type so the landing does not depend on the DB shape.
 *
 * `folderIds` are already prefixed (e.g. "dbfolder-12") by the fetcher.
 */
export interface EnrichedAccountTeam {
  team: TeamWithPokemon;
  pinned: boolean;
  archived: boolean;
  sortOrder: number | null;
  folderIds: string[];
  altUsername: string;
  altId: number;
  createdAt: string;
  updatedAt: string;
}

/** Account-record id scheme: `acct-${numericTeamId}`. Disjoint from `local-*`. */
export function accountRecordId(teamId: number): string {
  return `acct-${teamId}`;
}

/**
 * Parse an account-record id back to its numeric team id.
 * Returns null when `id` is not an account id (e.g. a "local-*" draft id).
 */
export function parseAccountTeamId(id: string): number | null {
  if (!id.startsWith("acct-")) return null;
  const n = Number(id.slice("acct-".length));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Map an enriched account team into the canonical landing record shape. */
export function toAccountRecord(t: EnrichedAccountTeam): LocalDraftRecord {
  return {
    id: accountRecordId(t.team.id),
    team: t.team,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    pinned: t.pinned,
    archived: t.archived,
    sortOrder: t.sortOrder,
    folderIds: t.folderIds,
    source: "account",
    accountTeamId: t.team.id,
    altId: t.altId,
  };
}
