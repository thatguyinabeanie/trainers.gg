/**
 * Shared test helpers for command handler tests.
 *
 * Builds a minimal CommandContext and stub APIApplicationCommandInteraction
 * so each test file doesn't duplicate this boilerplate.
 */

import {
  ApplicationCommandType,
  InteractionType,
  type APIChatInputApplicationCommandInteraction,
} from "discord-api-types/v10";

import type { CommandContext } from "../registry";

/** Build a fake ChatInput interaction with optional options. */
export function makeChatInputInteraction(
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
    guild_id: "guild-123",
    channel_id: "channel-456",
    member: {
      user: {
        id: "user-789",
        username: "tester",
        discriminator: "0001",
        avatar: null,
        global_name: null,
      },
      roles: [],
      premium_since: null,
      deaf: false,
      mute: false,
      pending: false,
      joined_at: "2024-01-01T00:00:00.000Z",
      flags: 0,
    },
    data: {
      id: "cmd-id",
      name: "test-command",
      type: ApplicationCommandType.ChatInput,
      options: options.map((o) => ({
        type: 3, // STRING
        name: o.name,
        value: o.value,
      })),
    },
    app_permissions: "0",
    authorizing_integration_owners: {},
    interaction_metadata: undefined as never,
  } as unknown as APIChatInputApplicationCommandInteraction;
}

/** Build a default CommandContext wrapping a ChatInput interaction. */
export function makeCommandContext(
  overrides: Partial<CommandContext> = {},
  options: { name: string; value: string }[] = []
): CommandContext {
  return {
    interaction: makeChatInputInteraction(options),
    guildId: "guild-123",
    userId: "user-789",
    communityId: 42,
    communitySlug: "test-community",
    ...overrides,
  };
}
