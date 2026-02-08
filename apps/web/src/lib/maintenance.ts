/**
 * Maintenance Mode Utilities
 *
 * Centralized logic for checking and handling maintenance mode across the application.
 */

/**
 * Check if maintenance mode is currently active
 *
 * @returns true if NEXT_PUBLIC_MAINTENANCE_MODE environment variable is set to "true"
 */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
}
