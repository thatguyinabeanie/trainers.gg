"use server";

import { checkBotId } from "botid/server";

/**
 * Consistent action result type for server actions.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Reject requests classified as bots by Vercel BotID.
 */
export async function rejectBots(): Promise<void> {
  const { isBot } = await checkBotId();
  if (isBot) throw new Error("Access denied");
}
