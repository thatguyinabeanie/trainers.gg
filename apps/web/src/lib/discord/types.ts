/**
 * Discord type aliases re-exported from discord-api-types/v10.
 *
 * All names match what they were before this refactor so downstream consumers
 * continue to compile without changes. Only the source of truth has moved —
 * from hand-rolled definitions to the official library.
 *
 * Reference: https://discord.com/developers/docs/interactions/receiving-and-responding
 */

export {
  InteractionType as DiscordInteractionType,
  InteractionResponseType as DiscordInteractionResponseType,
  MessageFlags,
  // Embed shapes
  type APIEmbed as DiscordEmbed,
  type APIEmbedField as DiscordEmbedField,
  type APIEmbedAuthor as DiscordEmbedAuthor,
  type APIEmbedFooter as DiscordEmbedFooter,
  type APIEmbedThumbnail as DiscordEmbedThumbnail,
  // Interaction payload
  type APIInteraction as DiscordInteractionPayload,
  type APIApplicationCommandInteractionDataOption as DiscordInteractionOption,
  type APIApplicationCommandOptionChoice as AutocompleteChoice,
  // User / guild / message shapes
  type APIUser as DiscordUser,
  type APIGuildMember as DiscordMember,
  type APIMessage as DiscordMessage,
  type APIGuildChannel as DiscordChannel,
  type APIRole as DiscordRole,
  // Command registration shapes
  type RESTPostAPIApplicationCommandsJSONBody as DiscordCommandDefinition,
  type APIApplicationCommandOption as DiscordCommandOption,
  // Message body shapes
  type RESTPostAPIChannelMessageJSONBody as DiscordMessageBody,
  type RESTPostAPICurrentUserCreateDMChannelJSONBody as DiscordDMChannelBody,
  type APIDMChannel as DiscordDMChannel,
} from "discord-api-types/v10";

// =============================================================================
// Local-only types that have no direct discord-api-types equivalent
// =============================================================================

/**
 * Bitfield flags for Discord messages.
 *
 * Use the `MessageFlags` enum from discord-api-types/v10 for flag values.
 * This const exists for backward-compat with callers using `DiscordMessageFlags.EPHEMERAL`.
 */
export const DiscordMessageFlags = {
  /** Only the invoking user can see the message. */
  EPHEMERAL: 64,
} as const;
