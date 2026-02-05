"use server";

/**
 * Server actions for sudo mode operations
 */

import { headers } from "next/headers";
import {
  activateSudoMode,
  deactivateSudoMode,
  isSudoModeActive,
  isSiteAdmin,
} from "./server";

export type SudoActionResult =
  | { success: true; isActive: boolean }
  | { success: false; error: string };

/**
 * Toggle sudo mode on or off.
 * Server action callable from client components.
 */
export async function toggleSudoMode(): Promise<SudoActionResult> {
  try {
    // Verify user is a site admin
    const isAdmin = await isSiteAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: "Only site admins can use sudo mode",
      };
    }

    // Check current state
    const isActive = await isSudoModeActive();

    // Get request metadata for logging
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    if (isActive) {
      // Deactivate sudo mode
      await deactivateSudoMode();
      return { success: true, isActive: false };
    } else {
      // Activate sudo mode
      await activateSudoMode(ipAddress, userAgent);
      return { success: true, isActive: true };
    }
  } catch (error) {
    console.error("Error toggling sudo mode:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle sudo mode",
    };
  }
}

/**
 * Check if sudo mode is currently active.
 * Server action callable from client components.
 */
export async function checkSudoStatus(): Promise<{
  isActive: boolean;
  isSiteAdmin: boolean;
}> {
  try {
    const isAdmin = await isSiteAdmin();
    if (!isAdmin) {
      return { isActive: false, isSiteAdmin: false };
    }

    const isActive = await isSudoModeActive();
    return { isActive, isSiteAdmin: true };
  } catch (error) {
    console.error("Error checking sudo status:", error);
    return { isActive: false, isSiteAdmin: false };
  }
}
