import {
  socialLinksSchema,
  userSettingsSchema,
  gamePreferencesSchema,
  updateProfileSchema,
  updateSettingsSchema,
  blueskyUserSchema,
} from "../user";

describe("socialLinksSchema", () => {
  it("accepts valid social links", () => {
    const result = socialLinksSchema.safeParse({
      twitter: "https://twitter.com/user",
      youtube: "https://youtube.com/@channel",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    expect(socialLinksSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid URLs for twitter", () => {
    const result = socialLinksSchema.safeParse({
      twitter: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows discord as plain string (not URL)", () => {
    const result = socialLinksSchema.safeParse({
      discord: "username#1234",
    });
    expect(result.success).toBe(true);
  });
});

describe("userSettingsSchema", () => {
  it("applies defaults", () => {
    const result = userSettingsSchema.parse({});
    expect(result.crossPostToBluesky).toBe(true);
    expect(result.defaultFeedView).toBe("pokemon");
  });

  it("accepts explicit values", () => {
    const result = userSettingsSchema.parse({
      crossPostToBluesky: false,
      defaultFeedView: "all",
    });
    expect(result.crossPostToBluesky).toBe(false);
    expect(result.defaultFeedView).toBe("all");
  });

  it("rejects invalid feed view", () => {
    const result = userSettingsSchema.safeParse({
      defaultFeedView: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("gamePreferencesSchema", () => {
  it("accepts valid game types", () => {
    const result = gamePreferencesSchema.safeParse(["VGC", "Showdown"]);
    expect(result.success).toBe(true);
  });

  it("accepts empty array", () => {
    expect(gamePreferencesSchema.safeParse([]).success).toBe(true);
  });

  it("rejects invalid game types", () => {
    const result = gamePreferencesSchema.safeParse(["InvalidGame"]);
    expect(result.success).toBe(false);
  });

  it("accepts all valid game types", () => {
    const all = ["VGC", "Showdown", "Draft", "Casual", "TCG", "Unite", "Go"];
    expect(gamePreferencesSchema.safeParse(all).success).toBe(true);
  });
});

describe("updateProfileSchema", () => {
  it("accepts valid profile update", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "Ash Ketchum",
      bio: "Gotta catch em all!",
      location: "Pallet Town",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("rejects display name longer than 64 chars", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "a".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("rejects bio longer than 256 chars", () => {
    const result = updateProfileSchema.safeParse({
      bio: "a".repeat(257),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid settings update", () => {
    const result = updateSettingsSchema.safeParse({
      crossPostToBluesky: false,
      defaultFeedView: "all",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(true);
  });
});

describe("blueskyUserSchema", () => {
  it("accepts a valid Bluesky user", () => {
    const result = blueskyUserSchema.safeParse({
      did: "did:plc:abc123",
      handle: "user.bsky.social",
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects DID not starting with 'did:'", () => {
    const result = blueskyUserSchema.safeParse({
      did: "plc:abc123",
      handle: "user.bsky.social",
    });
    expect(result.success).toBe(false);
  });

  it("requires handle", () => {
    const result = blueskyUserSchema.safeParse({
      did: "did:plc:abc123",
    });
    expect(result.success).toBe(false);
  });
});
