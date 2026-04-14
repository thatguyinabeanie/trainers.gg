/**
 * Command registry — the central map Phase 3c command files register into.
 *
 * The route imports `commandRegistry` from here to dispatch interactions.
 * Individual command files call `registerCommand(def)` at module scope so that
 * importing the file is sufficient to register it (side-effect import pattern).
 */

import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
} from "discord-api-types/v10";

// =============================================================================
// Context types
// =============================================================================

/** Context passed to every command handler after the deferred ACK is sent. */
export interface CommandContext {
  interaction: APIApplicationCommandInteraction;
  guildId: string;
  userId: string;
  /** Resolved from `guild_id` via `discord_servers → communities`. */
  communityId: number;
  /** Community slug — used for link URLs in embeds. */
  communitySlug: string;
}

/** Context passed to autocomplete handlers. */
export interface AutocompleteContext {
  interaction: APIApplicationCommandAutocompleteInteraction;
  guildId: string;
  userId: string;
  communityId: number;
  communitySlug: string;
  /** The currently-focused option the user is typing into. */
  focusedOption: { name: string; value: string };
}

// =============================================================================
// Handler types
// =============================================================================

/**
 * Command handler — called via `waitUntil` AFTER the deferred ACK is sent.
 * Must call `editInteractionResponse(interaction.token, ...)` to deliver the
 * final response. Errors propagate to the router, which logs them and edits
 * with a friendly fallback message.
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void>;

/**
 * Autocomplete handler — responds synchronously with choices (no deferral).
 * Return an array of up to 25 choice objects; the router caps at 25.
 */
export type AutocompleteHandler = (
  ctx: AutocompleteContext
) => Promise<{ name: string; value: string | number }[]>;

// =============================================================================
// Definition shape
// =============================================================================

export interface CommandDefinition {
  /** Must match the slash command name registered with Discord. */
  name: string;
  handler: CommandHandler;
  autocomplete?: AutocompleteHandler;
  /**
   * When true the deferred response is marked ephemeral (flags = 64).
   * The final edit is visible only to the invoking user.
   */
  ephemeral?: boolean;
  /**
   * When true, community resolution is skipped.
   * The command works in any server without a trainers.gg link.
   * Reserved for global-utility commands like `/help`.
   */
  unscoped?: boolean;
}

// =============================================================================
// Registry
// =============================================================================

/**
 * Global command registry.
 * Populated at module load time by command files via `registerCommand()`.
 * Phase 3c will import command files in `commands/index.ts` for side effects.
 */
export const commandRegistry = new Map<string, CommandDefinition>();

/**
 * Register a slash command definition.
 * Typically called at module scope in each command file.
 *
 * @param def - Command definition including name, handler, and options
 */
export function registerCommand(def: CommandDefinition): void {
  commandRegistry.set(def.name, def);
}
