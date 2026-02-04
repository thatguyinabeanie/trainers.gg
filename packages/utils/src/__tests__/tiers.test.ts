import {
  USER_TIERS,
  ORGANIZATION_TIERS,
  ORGANIZATION_SUBSCRIPTION_TIERS,
  TIER_PRICING,
  TOURNAMENT_FEE_PERCENTAGES,
  USER_TIER_FEATURES,
  ORGANIZATION_SUBSCRIPTION_FEATURES,
  getUserTierFeatures,
  getOrganizationFeatures,
  getTournamentFeePercentage,
  calculatePlatformFee,
} from "../tiers";

describe("tier constants", () => {
  describe("USER_TIERS", () => {
    it("has the expected tier values", () => {
      expect(USER_TIERS.FREE).toBe("free");
      expect(USER_TIERS.PLAYER_PRO).toBe("player_pro");
      expect(USER_TIERS.COACH_PREMIUM).toBe("coach_premium");
    });

    it("has exactly 3 tiers", () => {
      expect(Object.keys(USER_TIERS)).toHaveLength(3);
    });
  });

  describe("ORGANIZATION_TIERS", () => {
    it("has the expected tier values", () => {
      expect(ORGANIZATION_TIERS.REGULAR).toBe("regular");
      expect(ORGANIZATION_TIERS.VERIFIED).toBe("verified");
      expect(ORGANIZATION_TIERS.PARTNER).toBe("partner");
    });

    it("has exactly 3 tiers", () => {
      expect(Object.keys(ORGANIZATION_TIERS)).toHaveLength(3);
    });
  });

  describe("ORGANIZATION_SUBSCRIPTION_TIERS", () => {
    it("has the expected tier values", () => {
      expect(ORGANIZATION_SUBSCRIPTION_TIERS.FREE).toBe("free");
      expect(ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS).toBe(
        "organization_plus"
      );
      expect(ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE).toBe("enterprise");
    });

    it("has exactly 3 tiers", () => {
      expect(Object.keys(ORGANIZATION_SUBSCRIPTION_TIERS)).toHaveLength(3);
    });
  });
});

describe("TIER_PRICING", () => {
  it("has pricing for player_pro with monthly and annual amounts", () => {
    const pricing = TIER_PRICING[USER_TIERS.PLAYER_PRO];
    expect(pricing.monthly).toBe(999);
    expect(pricing.annual).toBe(9990);
  });

  it("has pricing for coach_premium with monthly and annual amounts", () => {
    const pricing = TIER_PRICING[USER_TIERS.COACH_PREMIUM];
    expect(pricing.monthly).toBe(1999);
    expect(pricing.annual).toBe(19990);
  });

  it("has pricing for organization_plus with monthly and annual amounts", () => {
    const pricing =
      TIER_PRICING[ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS];
    expect(pricing.monthly).toBe(2999);
    expect(pricing.annual).toBe(29990);
  });

  it("has null pricing for enterprise (custom pricing)", () => {
    const pricing = TIER_PRICING[ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE];
    expect(pricing.monthly).toBeNull();
    expect(pricing.annual).toBeNull();
  });

  it("annual pricing is cheaper per month than monthly pricing", () => {
    // player_pro: $9.99/mo vs $99.90/yr ($8.33/mo)
    const proPricing = TIER_PRICING[USER_TIERS.PLAYER_PRO];
    expect(proPricing.annual).toBeLessThan(proPricing.monthly * 12);

    // coach_premium: $19.99/mo vs $199.90/yr ($16.66/mo)
    const coachPricing = TIER_PRICING[USER_TIERS.COACH_PREMIUM];
    expect(coachPricing.annual).toBeLessThan(coachPricing.monthly * 12);

    // organization_plus: $29.99/mo vs $299.90/yr ($24.99/mo)
    const orgPricing =
      TIER_PRICING[ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS];
    expect(orgPricing.annual).toBeLessThan(orgPricing.monthly * 12);
  });
});

describe("TOURNAMENT_FEE_PERCENTAGES", () => {
  it("has a fee for regular organizations", () => {
    expect(TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.REGULAR]).toBe(0.08);
  });

  it("has a fee for verified organizations", () => {
    expect(TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.VERIFIED]).toBe(0.05);
  });

  it("has a fee for partner organizations", () => {
    expect(TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.PARTNER]).toBe(0.03);
  });

  it("all fees are between 0 and 1 (exclusive)", () => {
    for (const fee of Object.values(TOURNAMENT_FEE_PERCENTAGES)) {
      expect(fee).toBeGreaterThan(0);
      expect(fee).toBeLessThan(1);
    }
  });

  it("higher tiers have lower fees", () => {
    expect(
      TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.VERIFIED]
    ).toBeLessThan(TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.REGULAR]);
    expect(TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.PARTNER]).toBeLessThan(
      TOURNAMENT_FEE_PERCENTAGES[ORGANIZATION_TIERS.VERIFIED]
    );
  });
});

describe("USER_TIER_FEATURES", () => {
  it("free tier has ads and no premium features", () => {
    const features = USER_TIER_FEATURES[USER_TIERS.FREE];
    expect(features.adFreeExperience).toBe(false);
    expect(features.prioritySupport).toBe(false);
    expect(features.advancedAnalytics).toBe(false);
    expect(features.exportData).toBe(false);
    expect(features.premiumThemes).toBe(false);
    expect(features.battlePassMultiplier).toBe(1.0);
  });

  it("player_pro tier has premium features enabled", () => {
    const features = USER_TIER_FEATURES[USER_TIERS.PLAYER_PRO];
    expect(features.adFreeExperience).toBe(true);
    expect(features.prioritySupport).toBe(true);
    expect(features.advancedAnalytics).toBe(true);
    expect(features.exportData).toBe(true);
    expect(features.premiumThemes).toBe(true);
    expect(features.battlePassMultiplier).toBe(1.5);
  });

  it("coach_premium tier has player_pro features plus coach features", () => {
    const features = USER_TIER_FEATURES[USER_TIERS.COACH_PREMIUM];
    // Player pro features
    expect(features.adFreeExperience).toBe(true);
    expect(features.prioritySupport).toBe(true);
    expect(features.advancedAnalytics).toBe(true);
    // Coach-specific features
    expect(features.directBooking).toBe(true);
    expect(features.sessionRecordings).toBe(true);
    expect(features.progressTracking).toBe(true);
    expect(features.groupSessions).toBe(true);
  });
});

describe("ORGANIZATION_SUBSCRIPTION_FEATURES", () => {
  it("free tier has limited tournaments and no advanced features", () => {
    const features =
      ORGANIZATION_SUBSCRIPTION_FEATURES[ORGANIZATION_SUBSCRIPTION_TIERS.FREE];
    expect(features.maxTournaments).toBe(5);
    expect(features.autoBrackets).toBe(false);
    expect(features.autoReminders).toBe(false);
    expect(features.customThemes).toBe(false);
    expect(features.whiteLabel).toBe(false);
    expect(features.customDomains).toBe(false);
    expect(features.advancedMetrics).toBe(false);
  });

  it("organization_plus tier has unlimited tournaments and all features", () => {
    const features =
      ORGANIZATION_SUBSCRIPTION_FEATURES[
        ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS
      ];
    expect(features.maxTournaments).toBeNull(); // unlimited
    expect(features.autoBrackets).toBe(true);
    expect(features.autoReminders).toBe(true);
    expect(features.customThemes).toBe(true);
    expect(features.whiteLabel).toBe(true);
    expect(features.customDomains).toBe(true);
    expect(features.advancedMetrics).toBe(true);
  });

  it("enterprise tier has all plus features and enterprise-specific ones", () => {
    const features =
      ORGANIZATION_SUBSCRIPTION_FEATURES[
        ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE
      ];
    // Base plus features
    expect(features.maxTournaments).toBeNull();
    expect(features.autoBrackets).toBe(true);
    // Enterprise-specific
    expect(features.ssoIntegration).toBe(true);
    expect(features.apiAccess).toBe(true);
    expect(features.dedicatedSupport).toBe(true);
    expect(features.customFeatures).toBe(true);
  });
});

describe("getUserTierFeatures", () => {
  it("returns free tier features for undefined", () => {
    const features = getUserTierFeatures(undefined);
    expect(features).toEqual(USER_TIER_FEATURES[USER_TIERS.FREE]);
  });

  it("returns free tier features for 'free'", () => {
    const features = getUserTierFeatures("free");
    expect(features).toEqual(USER_TIER_FEATURES[USER_TIERS.FREE]);
  });

  it("returns player_pro features for 'player_pro'", () => {
    const features = getUserTierFeatures("player_pro");
    expect(features).toEqual(USER_TIER_FEATURES[USER_TIERS.PLAYER_PRO]);
  });

  it("returns coach_premium features for 'coach_premium'", () => {
    const features = getUserTierFeatures("coach_premium");
    expect(features).toEqual(USER_TIER_FEATURES[USER_TIERS.COACH_PREMIUM]);
  });
});

describe("getOrganizationFeatures", () => {
  it("returns free tier features for undefined", () => {
    const features = getOrganizationFeatures(undefined);
    expect(features).toEqual(
      ORGANIZATION_SUBSCRIPTION_FEATURES[ORGANIZATION_SUBSCRIPTION_TIERS.FREE]
    );
  });

  it("returns free tier features for 'free'", () => {
    const features = getOrganizationFeatures("free");
    expect(features).toEqual(
      ORGANIZATION_SUBSCRIPTION_FEATURES[ORGANIZATION_SUBSCRIPTION_TIERS.FREE]
    );
  });

  it("returns organization_plus features for 'organization_plus'", () => {
    const features = getOrganizationFeatures("organization_plus");
    expect(features).toEqual(
      ORGANIZATION_SUBSCRIPTION_FEATURES[
        ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS
      ]
    );
  });

  it("returns enterprise features for 'enterprise'", () => {
    const features = getOrganizationFeatures("enterprise");
    expect(features).toEqual(
      ORGANIZATION_SUBSCRIPTION_FEATURES[
        ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE
      ]
    );
  });
});

describe("getTournamentFeePercentage", () => {
  it("returns 8% for undefined (defaults to regular)", () => {
    expect(getTournamentFeePercentage(undefined)).toBe(0.08);
  });

  it("returns 8% for regular organizations", () => {
    expect(getTournamentFeePercentage("regular")).toBe(0.08);
  });

  it("returns 5% for verified organizations", () => {
    expect(getTournamentFeePercentage("verified")).toBe(0.05);
  });

  it("returns 3% for partner organizations", () => {
    expect(getTournamentFeePercentage("partner")).toBe(0.03);
  });

  it("all returned values are between 0 and 1", () => {
    const tiers = ["regular", "verified", "partner"] as const;
    for (const tier of tiers) {
      const percentage = getTournamentFeePercentage(tier);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(1);
    }
  });
});

describe("calculatePlatformFee", () => {
  it("calculates 8% fee for regular org with $10.00 entry", () => {
    // 1000 cents * 0.08 = 80 cents
    expect(calculatePlatformFee(1000, "regular")).toBe(80);
  });

  it("calculates 5% fee for verified org with $10.00 entry", () => {
    // 1000 cents * 0.05 = 50 cents
    expect(calculatePlatformFee(1000, "verified")).toBe(50);
  });

  it("calculates 3% fee for partner org with $10.00 entry", () => {
    // 1000 cents * 0.03 = 30 cents
    expect(calculatePlatformFee(1000, "partner")).toBe(30);
  });

  it("defaults to regular (8%) when org tier is undefined", () => {
    expect(calculatePlatformFee(1000, undefined)).toBe(80);
  });

  it("returns 0 for a $0.00 entry fee", () => {
    expect(calculatePlatformFee(0, "regular")).toBe(0);
  });

  it("rounds to the nearest integer (cent)", () => {
    // 1234 cents * 0.08 = 98.72 -> rounds to 99
    expect(calculatePlatformFee(1234, "regular")).toBe(99);
  });

  it("rounds down when the fractional part is less than 0.5", () => {
    // 1111 cents * 0.03 = 33.33 -> rounds to 33
    expect(calculatePlatformFee(1111, "partner")).toBe(33);
  });

  it("rounds up when the fractional part is 0.5 or more", () => {
    // 1550 cents * 0.05 = 77.5 -> rounds to 78
    expect(calculatePlatformFee(1550, "verified")).toBe(78);
  });

  it("handles large entry fees correctly", () => {
    // $100.00 = 10000 cents, regular 8% = 800 cents
    expect(calculatePlatformFee(10000, "regular")).toBe(800);
  });

  it("handles small entry fees", () => {
    // $1.00 = 100 cents, regular 8% = 8 cents
    expect(calculatePlatformFee(100, "regular")).toBe(8);
  });
});
