import {
  notificationPreferencesSchema,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
} from "../notification-preferences";

describe("notificationPreferencesSchema", () => {
  it("should accept a valid full preferences object", () => {
    const prefs: Record<string, boolean> = {};
    for (const type of NOTIFICATION_TYPES) {
      prefs[type] = true;
    }

    const result = notificationPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(true);
  });

  it("should accept a partial preferences object", () => {
    const prefs = {
      match_ready: false,
      tournament_start: true,
    };

    const result = notificationPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(true);
  });

  it("should accept an empty object", () => {
    const result = notificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject non-boolean values", () => {
    const prefs = {
      match_ready: "yes",
    };

    const result = notificationPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(false);
  });

  it("should reject invalid notification type keys", () => {
    const prefs = {
      invalid_type: true,
    };

    const result = notificationPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(false);
  });
});

describe("NOTIFICATION_TYPES", () => {
  it("should contain all expected notification types", () => {
    expect(NOTIFICATION_TYPES).toContain("match_ready");
    expect(NOTIFICATION_TYPES).toContain("match_result");
    expect(NOTIFICATION_TYPES).toContain("match_disputed");
    expect(NOTIFICATION_TYPES).toContain("match_no_show");
    expect(NOTIFICATION_TYPES).toContain("judge_call");
    expect(NOTIFICATION_TYPES).toContain("judge_resolved");
    expect(NOTIFICATION_TYPES).toContain("tournament_start");
    expect(NOTIFICATION_TYPES).toContain("tournament_round");
    expect(NOTIFICATION_TYPES).toContain("tournament_complete");
    expect(NOTIFICATION_TYPES).toContain("org_request_approved");
    expect(NOTIFICATION_TYPES).toContain("org_request_rejected");
  });

  it("should have exactly 11 types", () => {
    expect(NOTIFICATION_TYPES).toHaveLength(11);
  });
});

describe("NOTIFICATION_CATEGORIES", () => {
  it("should have 4 categories", () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(4);
  });

  it("should mark only Staff category as staff-only", () => {
    const staffOnlyCategories = NOTIFICATION_CATEGORIES.filter(
      (c) => c.staffOnly
    );
    expect(staffOnlyCategories).toHaveLength(1);
    expect(staffOnlyCategories[0]?.key).toBe("staff");
  });

  it("should cover all notification types across categories", () => {
    const allTypesInCategories = NOTIFICATION_CATEGORIES.flatMap((c) =>
      c.types.map((t) => t.key)
    );

    for (const type of NOTIFICATION_TYPES) {
      expect(allTypesInCategories).toContain(type);
    }
  });
});
