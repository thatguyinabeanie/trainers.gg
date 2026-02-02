/**
 * Shared registration and check-in logic.
 *
 * These pure functions encapsulate the business rules for determining whether
 * registration or check-in is open for a tournament. They are used by both
 * queries (to surface status to the UI) and mutations (to enforce access).
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
  start_date: string | null;
  check_in_window_minutes: number | null;
  current_round: number | null;
  late_check_in_max_round: number | null;
}

export interface CheckInOpenResult {
  isOpen: boolean;
  isLateCheckIn: boolean;
  checkInStartTime: number | null;
  checkInEndTime: number | null;
}

/**
 * Determine whether check-in is currently open for a tournament.
 *
 * Normal window: `start_date - check_in_window_minutes` to `start_date`.
 * Late check-in: tournament is active, `late_check_in_max_round` is set,
 *   and `current_round` is less than `late_check_in_max_round`.
 */
export function checkCheckInOpen(
  tournament: CheckInOpenInput,
  now?: number
): CheckInOpenResult {
  const currentTime = now ?? Date.now();

  const checkInWindowMinutes = tournament.check_in_window_minutes ?? 60;
  const startDate = tournament.start_date
    ? new Date(tournament.start_date).getTime()
    : null;
  const checkInStartTime = startDate
    ? startDate - checkInWindowMinutes * 60 * 1000
    : null;
  const checkInEndTime = startDate;

  // Normal check-in window
  const normalWindowOpen =
    checkInStartTime !== null &&
    checkInEndTime !== null &&
    currentTime >= checkInStartTime &&
    currentTime <= checkInEndTime;

  if (normalWindowOpen) {
    return {
      isOpen: true,
      isLateCheckIn: false,
      checkInStartTime,
      checkInEndTime,
    };
  }

  // Late check-in: tournament is active, max round is set, current round < max
  if (
    tournament.status === "active" &&
    tournament.late_check_in_max_round != null &&
    (tournament.current_round ?? 0) < tournament.late_check_in_max_round
  ) {
    return {
      isOpen: true,
      isLateCheckIn: true,
      checkInStartTime,
      checkInEndTime,
    };
  }

  return {
    isOpen: false,
    isLateCheckIn: false,
    checkInStartTime,
    checkInEndTime,
  };
}
