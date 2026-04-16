"use server";

import { z, type ActionResult } from "@trainers/validators";
import { checkBotId } from "botid/server";
import { getErrorMessage } from "@trainers/utils";
import { headers } from "next/headers";

/**
 * Reject requests classified as bots by Vercel BotID.
 *
 * Used by all server actions as the standard bot detection gate.
 * Allows trusted E2E automation to bypass BotID when the request includes
 * x-vercel-protection-bypass matching VERCEL_AUTOMATION_BYPASS_SECRET.
 */
export async function rejectBots(): Promise<void> {
  const requestHeaders = await headers();
  const bypassHeader = requestHeaders.get("x-vercel-protection-bypass");
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (bypassHeader && bypassSecret && bypassHeader === bypassSecret) {
    // Dev + CI only — visibility during tests without leaking bypass activity
    // or contributing log noise in production.
    if (process.env.NODE_ENV !== "production") {
      console.debug("[rejectBots] Bypassed via automation header");
    }
    return;
  }

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
      console.error("[server-action] validation error", error.flatten());
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
