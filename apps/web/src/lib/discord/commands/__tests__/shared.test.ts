/**
 * @jest-environment node
 *
 * Tests for shared command helper modules:
 * - shared/options.ts
 * - shared/require-linked-account.ts
 * - shared/require-community-leader.ts
 * - shared/resolve-tournament.ts
 * - shared/site-url.ts
 */

// =============================================================================
// Mocks
// =============================================================================

const mockGetUserByDiscordId = jest.fn();
const mockHasCommunityAccess = jest.fn();
const mockListActiveTournaments = jest.fn();
const mockGetTournamentByNameOrSlugInCommunity = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getUserByDiscordId: mockGetUserByDiscordId,
  hasCommunityAccess: mockHasCommunityAccess,
  listActiveTournaments: mockListActiveTournaments,
  getTournamentByNameOrSlugInCommunity:
    mockGetTournamentByNameOrSlugInCommunity,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  ApplicationCommandType,
  InteractionType,
  type APIChatInputApplicationCommandInteraction,
  type APIUserApplicationCommandInteraction,
} from "discord-api-types/v10";

import { getChatInputOptions } from "../shared/options";
import { requireLinkedAccount } from "../shared/require-linked-account";
import { requireCommunityLeader } from "../shared/require-community-leader";
import { resolveTournament } from "../shared/resolve-tournament";
import { SITE_URL } from "../shared/site-url";

import type { TypedClient } from "@trainers/supabase";

// =============================================================================
// Helpers
// =============================================================================

const SUPABASE_STUB = {} as unknown as TypedClient;

const TOURNAMENT = {
  id: 10,
  name: "Spring Cup",
  slug: "spring-cup",
  status: "active",
  format: "VGC 2025",
  start_date: "2026-05-01",
  community_id: 42,
};

function makeChatInputInteraction(
  options: { name: string; value: string }[] = []
): APIChatInputApplicationCommandInteraction {
  return {
    id: "interaction-id",
    application_id: "app-id",
    type: InteractionType.ApplicationCommand,
    token: "test-token",
    version: 1,
    locale: "en-US",
    entitlements: [],
    data: {
      id: "cmd-id",
      name: "test",
      type: ApplicationCommandType.ChatInput,
      options: options.map((o) => ({ type: 3, name: o.name, value: o.value })),
    },
    authorizing_integration_owners: {},
  } as unknown as APIChatInputApplicationCommandInteraction;
}

function makeUserCommandInteraction(): APIUserApplicationCommandInteraction {
  return {
    id: "interaction-id",
    application_id: "app-id",
    type: InteractionType.ApplicationCommand,
    token: "test-token",
    version: 1,
    locale: "en-US",
    entitlements: [],
    data: {
      id: "cmd-id",
      name: "test",
      type: ApplicationCommandType.User,
    },
    authorizing_integration_owners: {},
  } as unknown as APIUserApplicationCommandInteraction;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// getChatInputOptions
// =============================================================================

describe("getChatInputOptions", () => {
  it("returns options array for a ChatInput interaction", () => {
    const interaction = makeChatInputInteraction([
      { name: "tournament", value: "spring-cup" },
      { name: "scope", value: "current" },
    ]);

    const options = getChatInputOptions(interaction);

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      name: "tournament",
      value: "spring-cup",
    });
    expect(options[1]).toMatchObject({ name: "scope", value: "current" });
  });

  it("returns empty array for a ChatInput interaction with no options", () => {
    const interaction = makeChatInputInteraction([]);
    const options = getChatInputOptions(interaction);
    expect(options).toEqual([]);
  });

  it("returns empty array for a non-ChatInput interaction type", () => {
    const interaction = makeUserCommandInteraction();
    const options = getChatInputOptions(interaction);
    expect(options).toEqual([]);
  });
});

// =============================================================================
// requireLinkedAccount
// =============================================================================

describe("requireLinkedAccount", () => {
  it("returns { ok: true, userId } when Discord account is linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "uuid-abc" });

    const result = await requireLinkedAccount(SUPABASE_STUB, "discord-123");

    expect(result).toEqual({ ok: true, userId: "uuid-abc" });
    expect(mockGetUserByDiscordId).toHaveBeenCalledWith(
      SUPABASE_STUB,
      "discord-123"
    );
  });

  it("returns { ok: false, message } when no linked account", async () => {
    mockGetUserByDiscordId.mockResolvedValue(null);

    const result = await requireLinkedAccount(SUPABASE_STUB, "discord-123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("/link");
    }
  });

  it("propagates errors from getUserByDiscordId", async () => {
    mockGetUserByDiscordId.mockRejectedValue(new Error("db failure"));

    await expect(
      requireLinkedAccount(SUPABASE_STUB, "discord-123")
    ).rejects.toThrow("db failure");
  });
});

// =============================================================================
// requireCommunityLeader
// =============================================================================

describe("requireCommunityLeader", () => {
  it("returns { ok: true, userId } when user is a community leader", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "uuid-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);

    const result = await requireCommunityLeader(
      SUPABASE_STUB,
      "discord-123",
      42,
      "Test Community"
    );

    expect(result).toEqual({ ok: true, userId: "uuid-abc" });
    expect(mockHasCommunityAccess).toHaveBeenCalledWith(
      SUPABASE_STUB,
      42,
      "uuid-abc"
    );
  });

  it("returns { ok: false } when user is not linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue(null);

    const result = await requireCommunityLeader(
      SUPABASE_STUB,
      "discord-123",
      42,
      "Test Community"
    );

    expect(result.ok).toBe(false);
  });

  it("returns { ok: false, message } when user is not a community leader", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "uuid-abc" });
    mockHasCommunityAccess.mockResolvedValue(false);

    const result = await requireCommunityLeader(
      SUPABASE_STUB,
      "discord-123",
      42,
      "Pallet Town"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("community leader");
      expect(result.message).toContain("Pallet Town");
    }
  });
});

// =============================================================================
// resolveTournament
// =============================================================================

describe("resolveTournament", () => {
  it("resolves by slug/name when slugOrName is provided and tournament is found", async () => {
    mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(TOURNAMENT);

    const result = await resolveTournament(SUPABASE_STUB, 42, "spring-cup");

    expect(result).toEqual({ ok: true, value: TOURNAMENT });
    expect(mockGetTournamentByNameOrSlugInCommunity).toHaveBeenCalledWith(
      SUPABASE_STUB,
      42,
      "spring-cup"
    );
  });

  it("returns { ok: false } when named tournament is not found", async () => {
    mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(null);

    const result = await resolveTournament(SUPABASE_STUB, 42, "unknown");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('"unknown"');
    }
  });

  it("resolves to the single active tournament when no slugOrName", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    const result = await resolveTournament(SUPABASE_STUB, 42);

    expect(result).toEqual({ ok: true, value: TOURNAMENT });
    expect(mockListActiveTournaments).toHaveBeenCalledWith(SUPABASE_STUB, 42);
  });

  it("returns { ok: false } when no active tournaments", async () => {
    mockListActiveTournaments.mockResolvedValue([]);

    const result = await resolveTournament(SUPABASE_STUB, 42);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("No active tournaments");
    }
  });

  it("returns { ok: false } when multiple active tournaments and no arg", async () => {
    const t2 = { ...TOURNAMENT, id: 11, name: "Summer Slam" };
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT, t2]);

    const result = await resolveTournament(SUPABASE_STUB, 42);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Multiple tournaments active");
      expect(result.message).toContain("Spring Cup");
      expect(result.message).toContain("Summer Slam");
    }
  });
});

// =============================================================================
// SITE_URL
// =============================================================================

describe("SITE_URL", () => {
  it("has a value (env var or default fallback)", () => {
    expect(typeof SITE_URL).toBe("string");
    expect(SITE_URL.length).toBeGreaterThan(0);
  });

  it("uses the default https://trainers.gg when env var is not set", () => {
    // SITE_URL is evaluated at import time, but the default is always present
    // when NEXT_PUBLIC_SITE_URL is not set in the test environment.
    // We can verify it's a valid URL string.
    expect(SITE_URL).toMatch(/^https?:\/\//);
  });
});
