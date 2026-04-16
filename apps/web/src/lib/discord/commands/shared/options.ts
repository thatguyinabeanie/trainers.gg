/**
 * Shared helper — safely extract options from a ChatInput command interaction.
 *
 * Discord's `interaction.data` is a union across ChatInput, Message, User,
 * and PrimaryEntryPoint command types. Only ChatInput commands carry `.options`.
 * This helper narrows the type and returns the options array (or empty array).
 */

import {
  type APIApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataOption,
  ApplicationCommandType,
} from "discord-api-types/v10";

/**
 * Returns the options array from a ChatInput command interaction.
 * Returns an empty array for Message, User, or PrimaryEntryPoint commands.
 *
 * @param interaction - The incoming application command interaction
 */
export function getChatInputOptions(
  interaction: APIApplicationCommandInteraction
): APIApplicationCommandInteractionDataOption[] {
  if (interaction.data.type !== ApplicationCommandType.ChatInput) return [];
  return interaction.data.options ?? [];
}
