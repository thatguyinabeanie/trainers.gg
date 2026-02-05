/**
 * Label mappings for enum values throughout the app.
 * Maps raw database/enum values to human-readable labels for UI display.
 */

// ============================================================================
// Registration Status Labels
// ============================================================================

export const registrationStatusLabels: Record<string, string> = {
  registered: "Registered",
  checked_in: "Checked In",
  dropped: "Dropped",
  disqualified: "Disqualified",
  confirmed: "Confirmed",
  pending: "Pending",
  waitlist: "Waitlist",
  declined: "Declined",
};

// ============================================================================
// Tournament Status Labels
// ============================================================================

export const tournamentStatusLabels: Record<string, string> = {
  draft: "Draft",
  registration: "Registration Open",
  active: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  upcoming: "Upcoming",
};

// ============================================================================
// Match Status Labels
// ============================================================================

export const matchStatusLabels: Record<string, string> = {
  pending: "Not Started",
  active: "In Progress",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ============================================================================
// Round Status Labels
// ============================================================================

export const roundStatusLabels: Record<string, string> = {
  pending: "Not Started",
  active: "In Progress",
  completed: "Completed",
};

// ============================================================================
// Helper Function
// ============================================================================

/**
 * Get a human-readable label for a given value using the provided mapping.
 * Falls back to the raw value if no mapping exists.
 *
 * @param value - The raw enum/database value
 * @param map - The label mapping object
 * @returns The human-readable label or the original value if not found
 */
export function getLabel(value: string, map: Record<string, string>): string {
  return map[value] ?? value;
}
