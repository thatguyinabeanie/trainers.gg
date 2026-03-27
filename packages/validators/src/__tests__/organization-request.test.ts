import { submitOrganizationRequestSchema } from "../organization-request";

// ---------------------------------------------------------------------------
// submitOrganizationRequestSchema
// ---------------------------------------------------------------------------

const validBase = {
  name: "Pallet Town League",
  slug: "pallet-town-league",
  description: "Competitive Pokemon tournaments in Pallet Town",
  discord_invite_code: "pallet-town",
};

describe("submitOrganizationRequestSchema", () => {
  it("accepts valid request data", () => {
    const result = submitOrganizationRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects request without description", () => {
    const { description: _, ...without } = validBase;
    const result = submitOrganizationRequestSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejects request with empty description", () => {
    const result = submitOrganizationRequestSchema.safeParse({
      ...validBase,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects request without discord_invite_code", () => {
    const { discord_invite_code: _, ...without } = validBase;
    const result = submitOrganizationRequestSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it.each([
    { desc: "empty string", code: "" },
    { desc: "contains spaces", code: "invalid code" },
    { desc: "contains special characters", code: "abc!@#" },
  ])("rejects discord_invite_code: $desc", ({ code }) => {
    const result = submitOrganizationRequestSchema.safeParse({
      ...validBase,
      discord_invite_code: code,
    });
    expect(result.success).toBe(false);
  });

  it.each([
    { desc: "simple code", code: "abc123" },
    { desc: "code with hyphens", code: "pallet-town" },
    { desc: "alphanumeric", code: "VGCLeague2026" },
  ])("accepts discord_invite_code: $desc", ({ code }) => {
    const result = submitOrganizationRequestSchema.safeParse({
      ...validBase,
      discord_invite_code: code,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    { desc: "empty name", input: { ...validBase, name: "" } },
    {
      desc: "name over 100 chars",
      input: { ...validBase, name: "a".repeat(101) },
    },
    { desc: "empty slug", input: { ...validBase, slug: "" } },
    { desc: "uppercase slug", input: { ...validBase, slug: "Invalid-Slug" } },
    {
      desc: "slug with underscores",
      input: { ...validBase, slug: "invalid_slug" },
    },
    {
      desc: "slug with spaces",
      input: { ...validBase, slug: "invalid slug" },
    },
    {
      desc: "description over 500 chars",
      input: { ...validBase, description: "a".repeat(501) },
    },
  ])("rejects $desc", ({ input }) => {
    const result = submitOrganizationRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it.each([
    { desc: "simple slug", slug: "pokemon-league" },
    { desc: "numeric slug", slug: "league-2024" },
    { desc: "single character slug", slug: "a" },
  ])("accepts $desc", ({ slug }) => {
    const result = submitOrganizationRequestSchema.safeParse({
      ...validBase,
      slug,
    });
    expect(result.success).toBe(true);
  });

  describe("transforms", () => {
    it("trims handle whitespace and transforms to string", () => {
      const result = submitOrganizationRequestSchema.safeParse({
        ...validBase,
        twitter_handle: "  pallettown  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.twitter_handle).toBe("pallettown");
      }
    });

    it("transforms empty handle to undefined", () => {
      const result = submitOrganizationRequestSchema.safeParse({
        ...validBase,
        twitter_handle: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.twitter_handle).toBeUndefined();
      }
    });

    it("transforms empty other_url to undefined", () => {
      const result = submitOrganizationRequestSchema.safeParse({
        ...validBase,
        other_url: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.other_url).toBeUndefined();
      }
    });

    it("trims other_url whitespace before validation", () => {
      const result = submitOrganizationRequestSchema.safeParse({
        ...validBase,
        other_url: "  https://example.com  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.other_url).toBe("https://example.com");
      }
    });
  });
});
