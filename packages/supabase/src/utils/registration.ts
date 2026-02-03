/**
 * Shared registration and check-in logic.
 *
 * These pure functions encapsulate the business rules for determining whether
 * registration or check-in is open for a tournament. They are used by both
 * queries (to surface status to the UI) and mutations (to enforce access).
 *
 * Unified model: check-in is open whenever registration is open. There is no
 * separate time-based check-in window. Both are controlled by tournament status
 * and the `allow_late_registration` + `late_check_in_max_round` settings.
 */

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface RegistrationOpenInput {
  status: string | null;
  allow_late_registration: boolean | null;
}

export interface RegistrationOpenResult {
  isOpen: boolean;
  isLateRegistration: boolean;
}

/**
 * Determine whether registration is currently open for a tournament.
 *
 * Truth table:
 * | Status   | allow_late_registration | Result      |
 * |----------|------------------------|-------------|
 * | upcoming | any                    | open        |
 * | active   | true                   | open (late) |
 * | active   | false                  | closed      |
 * | other    | any                    | closed      |
 */
export function checkRegistrationOpen(
  tournament: RegistrationOpenInput
): RegistrationOpenResult {
  // Only "upcoming" and "active" statuses can have open registration
  if (tournament.status === "upcoming") {
    return {
      isOpen: true,
      isLateRegistration: false,
    };
  }

  if (tournament.status === "active") {
    const isLate = tournament.allow_late_registration === true;
    return {
      isOpen: isLate,
      isLateRegistration: isLate,
    };
  }

  return { isOpen: false, isLateRegistration: false };
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

export interface CheckInOpenInput {
  status: string | null;
  allow_late_registration: boolean | null;
  current_round: number | null;
  late_check_in_max_round: number | null;
  // Deprecated fields kept for backwards compatibility (mobile app passes full
  // tournament objects). These are ignored by the function.
  start_date?: string | null;
  check_in_window_minutes?: number | null;
}

export interface CheckInOpenResult {
  isOpen: boolean;
  isLateCheckIn: boolean;
  /** The round number after which late registration/check-in closes. */
  lateMaxRound: number | null;
}

/**
 * Determine whether check-in is currently open for a tournament.
 *
 * Unified model: check-in is open whenever registration is open.
 * - Upcoming tournaments: always open.
 * - Active tournaments: open if `allow_late_registration` is true and
 *   `current_round < late_check_in_max_round`.
 */
export function checkCheckInOpen(
  tournament: CheckInOpenInput,
  _now?: number
): CheckInOpenResult {
  const lateMaxRound = tournament.late_check_in_max_round ?? null;

  // Upcoming: check-in is always open (same as registration)
  if (tournament.status === "upcoming") {
    return {
      isOpen: true,
      isLateCheckIn: false,
      lateMaxRound,
    };
  }

  // Active: check-in open if late registration is allowed and round limit not reached
  if (
    tournament.status === "active" &&
    tournament.allow_late_registration === true &&
    lateMaxRound != null &&
    (tournament.current_round ?? 0) < lateMaxRound
  ) {
    return {
      isOpen: true,
      isLateCheckIn: true,
      lateMaxRound,
    };
  }

  return {
    isOpen: false,
    isLateCheckIn: false,
    lateMaxRound,
  };
}
