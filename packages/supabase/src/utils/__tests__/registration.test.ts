import {
  checkRegistrationOpen,
  checkCheckInOpen,
  type RegistrationOpenInput,
  type CheckInOpenInput,
} from "../registration";

describe("checkRegistrationOpen", () => {
  it("returns open for upcoming tournaments", () => {
    const tournament: RegistrationOpenInput = {
      status: "upcoming",
      allow_late_registration: false,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(true);
    expect(result.isLateRegistration).toBe(false);
  });

  it("returns open for upcoming regardless of late reg flag", () => {
    const tournament: RegistrationOpenInput = {
      status: "upcoming",
      allow_late_registration: true,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(true);
    expect(result.isLateRegistration).toBe(false);
  });

  it("returns open (late) for active tournaments with late registration", () => {
    const tournament: RegistrationOpenInput = {
      status: "active",
      allow_late_registration: true,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(true);
    expect(result.isLateRegistration).toBe(true);
  });

  it("returns closed for active tournaments without late registration", () => {
    const tournament: RegistrationOpenInput = {
      status: "active",
      allow_late_registration: false,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(false);
    expect(result.isLateRegistration).toBe(false);
  });

  it("returns closed for completed tournaments", () => {
    const tournament: RegistrationOpenInput = {
      status: "completed",
      allow_late_registration: true,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed for cancelled tournaments", () => {
    const tournament: RegistrationOpenInput = {
      status: "cancelled",
      allow_late_registration: true,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed for null status", () => {
    const tournament: RegistrationOpenInput = {
      status: null,
      allow_late_registration: true,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("handles null allow_late_registration as false for active", () => {
    const tournament: RegistrationOpenInput = {
      status: "active",
      allow_late_registration: null,
    };
    const result = checkRegistrationOpen(tournament);
    expect(result.isOpen).toBe(false);
  });
});

describe("checkCheckInOpen", () => {
  it("returns open for upcoming tournaments", () => {
    const tournament: CheckInOpenInput = {
      status: "upcoming",
      allow_late_registration: false,
      current_round: null,
      late_check_in_max_round: null,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(true);
    expect(result.isLateCheckIn).toBe(false);
  });

  it("returns open (late) for active with late reg and under round limit", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: true,
      current_round: 1,
      late_check_in_max_round: 3,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(true);
    expect(result.isLateCheckIn).toBe(true);
    expect(result.lateMaxRound).toBe(3);
  });

  it("returns closed when current round equals max round", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: true,
      current_round: 3,
      late_check_in_max_round: 3,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed when current round exceeds max round", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: true,
      current_round: 5,
      late_check_in_max_round: 3,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed for active without late registration", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: false,
      current_round: 1,
      late_check_in_max_round: 3,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed when late_check_in_max_round is null", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: true,
      current_round: 1,
      late_check_in_max_round: null,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("returns closed for completed tournaments", () => {
    const tournament: CheckInOpenInput = {
      status: "completed",
      allow_late_registration: true,
      current_round: 1,
      late_check_in_max_round: 5,
    };
    const result = checkCheckInOpen(tournament);
    expect(result.isOpen).toBe(false);
  });

  it("treats null current_round as 0", () => {
    const tournament: CheckInOpenInput = {
      status: "active",
      allow_late_registration: true,
      current_round: null,
      late_check_in_max_round: 3,
    };
    const result = checkCheckInOpen(tournament);
    // null current_round → 0, 0 < 3 → open
    expect(result.isOpen).toBe(true);
  });
});
