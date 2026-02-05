import {
  registrationStatusLabels,
  tournamentStatusLabels,
  matchStatusLabels,
  roundStatusLabels,
  getLabel,
} from "../labels";

describe("labels", () => {
  describe("registrationStatusLabels", () => {
    it("should map registration statuses to human-readable labels", () => {
      expect(registrationStatusLabels.registered).toBe("Registered");
      expect(registrationStatusLabels.checked_in).toBe("Checked In");
      expect(registrationStatusLabels.dropped).toBe("Dropped");
      expect(registrationStatusLabels.disqualified).toBe("Disqualified");
      expect(registrationStatusLabels.confirmed).toBe("Confirmed");
      expect(registrationStatusLabels.pending).toBe("Pending");
      expect(registrationStatusLabels.waitlist).toBe("Waitlist");
      expect(registrationStatusLabels.declined).toBe("Declined");
    });
  });

  describe("tournamentStatusLabels", () => {
    it("should map tournament statuses to human-readable labels", () => {
      expect(tournamentStatusLabels.draft).toBe("Draft");
      expect(tournamentStatusLabels.registration).toBe("Registration Open");
      expect(tournamentStatusLabels.active).toBe("In Progress");
      expect(tournamentStatusLabels.completed).toBe("Completed");
      expect(tournamentStatusLabels.cancelled).toBe("Cancelled");
      expect(tournamentStatusLabels.upcoming).toBe("Upcoming");
    });
  });

  describe("matchStatusLabels", () => {
    it("should map match statuses to human-readable labels", () => {
      expect(matchStatusLabels.pending).toBe("Not Started");
      expect(matchStatusLabels.active).toBe("In Progress");
      expect(matchStatusLabels.in_progress).toBe("In Progress");
      expect(matchStatusLabels.completed).toBe("Completed");
      expect(matchStatusLabels.cancelled).toBe("Cancelled");
    });
  });

  describe("roundStatusLabels", () => {
    it("should map round statuses to human-readable labels", () => {
      expect(roundStatusLabels.pending).toBe("Not Started");
      expect(roundStatusLabels.active).toBe("In Progress");
      expect(roundStatusLabels.completed).toBe("Completed");
    });
  });

  describe("getLabel", () => {
    it("should return the mapped label when it exists", () => {
      expect(getLabel("checked_in", registrationStatusLabels)).toBe(
        "Checked In"
      );
      expect(getLabel("draft", tournamentStatusLabels)).toBe("Draft");
      expect(getLabel("active", matchStatusLabels)).toBe("In Progress");
    });

    it("should return the original value when no mapping exists", () => {
      expect(getLabel("unknown_status", registrationStatusLabels)).toBe(
        "unknown_status"
      );
      expect(getLabel("custom_value", tournamentStatusLabels)).toBe(
        "custom_value"
      );
    });

    it("should handle empty strings", () => {
      expect(getLabel("", registrationStatusLabels)).toBe("");
    });
  });
});
