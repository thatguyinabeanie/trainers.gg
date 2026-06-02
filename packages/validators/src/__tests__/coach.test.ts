import { coachProfileSchema } from "../coach";

describe("coachProfileSchema", () => {
  it("accepts a valid profile", () => {
    const result = coachProfileSchema.safeParse({
      headline: "VGC coach, 3x Regional Top Cut",
      bio: "I help players sharpen teambuilding.",
      formats: ["vgc-reg-h"],
      links: [{ label: "Twitter", url: "https://x.com/me" }],
      serviceTypes: ["live", "team_review"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid service type", () => {
    const result = coachProfileSchema.safeParse({
      headline: "x", bio: "", formats: [], links: [], serviceTypes: ["bogus"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL link", () => {
    const result = coachProfileSchema.safeParse({
      headline: "x", bio: "", formats: [], links: [{ label: "bad", url: "not-a-url" }], serviceTypes: [],
    });
    expect(result.success).toBe(false);
  });
});
