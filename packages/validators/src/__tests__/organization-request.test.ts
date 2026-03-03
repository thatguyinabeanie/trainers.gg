import { submitOrganizationRequestSchema } from "../organization-request";

// ---------------------------------------------------------------------------
// submitOrganizationRequestSchema
// ---------------------------------------------------------------------------

describe("submitOrganizationRequestSchema", () => {
  it("accepts valid request data", () => {
    const result = submitOrganizationRequestSchema.safeParse({
      name: "Pallet Town League",
      slug: "pallet-town-league",
      description: "Competitive Pokemon tournaments in Pallet Town",
    });
    expect(result.success).toBe(true);
  });

  it("accepts request without description", () => {
    const result = submitOrganizationRequestSchema.safeParse({
      name: "Pallet Town League",
      slug: "pallet-town-league",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    { desc: "empty name", input: { name: "", slug: "valid-slug" } },
    {
      desc: "name over 100 chars",
      input: { name: "a".repeat(101), slug: "valid-slug" },
    },
    { desc: "empty slug", input: { name: "Valid Name", slug: "" } },
    { desc: "missing slug", input: { name: "Valid Name" } },
    { desc: "missing name", input: { slug: "valid-slug" } },
    {
      desc: "uppercase slug",
      input: { name: "Valid Name", slug: "Invalid-Slug" },
    },
    {
      desc: "slug with underscores",
      input: { name: "Valid Name", slug: "invalid_slug" },
    },
    {
      desc: "slug with spaces",
      input: { name: "Valid Name", slug: "invalid slug" },
    },
    {
      desc: "description over 500 chars",
      input: {
        name: "Valid Name",
        slug: "valid-slug",
        description: "a".repeat(501),
      },
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
      name: "Valid Name",
      slug,
    });
    expect(result.success).toBe(true);
  });
});
