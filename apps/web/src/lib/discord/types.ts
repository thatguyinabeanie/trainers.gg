/**
 * TypeScript type definitions for Discord interaction payloads, response types,
 * and embed shapes used by the trainers.gg Discord bot (HTTP Interactions Endpoint).
 *
 * Reference: https://discord.com/developers/docs/interactions/receiving-and-responding
 */

// =============================================================================
// Enums
// =============================================================================

/** Discord interaction type sent by Discord in every interaction request. */
export enum DiscordInteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

/** Type of response sent back to Discord. */
export enum DiscordInteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
  MODAL = 9,
}

/** Bitfield flags for Discord messages. */
export const DiscordMessageFlags = {
  /** Only the invoking user can see the message. */
  EPHEMERAL: 64,
} as const;

// =============================================================================
// Embed shapes
// =============================================================================

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbedThumbnail {
  url: string;
}

export interface DiscordEmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

/** Discord rich embed. All fields are optional. */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: DiscordEmbedFooter;
  timestamp?: string;
  thumbnail?: DiscordEmbedThumbnail;
  author?: DiscordEmbedAuthor;
}

// =============================================================================
// Interaction payload
// =============================================================================

/** A single command option (can be nested for subcommands or autocomplete). */
export interface DiscordInteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
  /** True when this option is focused during autocomplete. */
  focused?: boolean;
}

/** The `data` field of an application command interaction. */
export interface DiscordInteractionData {
  /** Command name (for APPLICATION_COMMAND). */
  name?: string;
  /** Command options. */
  options?: DiscordInteractionOption[];
  /** Component custom_id (for MESSAGE_COMPONENT / MODAL_SUBMIT). */
  custom_id?: string;
  /** Selected values (for select-menu components). */
  values?: string[];
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
}

export interface DiscordMember {
  user: DiscordUser;
  roles: string[];
  nick?: string;
}

/** Full inbound interaction payload from Discord. */
export interface DiscordInteractionPayload {
  id: string;
  application_id: string;
  type: DiscordInteractionType;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  /** Present when interaction occurs in a guild. */
  member?: DiscordMember;
  /** Present when interaction occurs in a DM. */
  user?: DiscordUser;
  /** Interaction token (valid for 15 minutes). */
  token: string;
  version: number;
  locale?: string;
}

// =============================================================================
// Autocomplete
// =============================================================================

/** A single choice in an autocomplete response. */
export interface AutocompleteChoice {
  name: string;
  value: string | number;
}

// =============================================================================
// REST request/response shapes
// =============================================================================

/** Body for sending a channel message or interaction response. */
export interface DiscordMessageBody {
  content?: string;
  embeds?: DiscordEmbed[];
  flags?: number;
  allowed_mentions?: {
    parse: string[];
  };
}

/** Body for opening a DM channel (POST /users/@me/channels). */
export interface DiscordDMChannelBody {
  recipient_id: string;
}

/** Response from POST /users/@me/channels. */
export interface DiscordDMChannel {
  id: string;
  type: number;
}

/** A Discord message object (partial — only fields we use). */
export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
}

/** A Discord guild channel (partial). */
export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position?: number;
  parent_id?: string;
}

/** A Discord guild role (partial). */
export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

/** A Discord application command definition (partial — what we send to register). */
export interface DiscordCommandDefinition {
  name: string;
  description: string;
  options?: DiscordCommandOption[];
}

export interface DiscordCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: AutocompleteChoice[];
  autocomplete?: boolean;
  options?: DiscordCommandOption[];
}
