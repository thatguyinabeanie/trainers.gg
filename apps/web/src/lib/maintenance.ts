/**
 * Maintenance Mode Utilities (client-safe)
 *
 * Synchronous check for maintenance mode via environment variable.
 * Safe to import from client components.
 *
 * For the async server-side check (env var + database feature flag),
 * use `isMaintenanceModeEnabledAsync` from `@/lib/maintenance-server`.
 */

/**
 * Check if maintenance mode is enabled via the environment variable.
 * This is a synchronous check used as a fast override/fallback.
 */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
}
