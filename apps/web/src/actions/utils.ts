"use server";

import { z } from "zod";
import { checkBotId } from "botid/server";
import { getErrorMessage } from "@trainers/utils";
import { type ActionResult } from "@trainers/validators";

// Re-export ActionResult for backward compatibility
export type { ActionResult };

/**
 * Reject requests classified as bots by Vercel BotID.
 */
export async function rejectBots(): Promise<void> {
  const { isBot } = await checkBotId();
  if (isBot) throw new Error("Access denied");
}

/**
 * Wraps an async action with consistent error handling.
 * Catches Zod validation errors and generic errors, returning ActionResult.
 */
export async function withAction<T>(
  fn: () => Promise<T>,
  fallbackMessage: string
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Invalid input",
      };
    }
    console.error("[server-action]", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        fallbackMessage,
        process.env.NODE_ENV === "production"
      ),
    };
  }
}
