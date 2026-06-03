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

  it("rejects a profane headline", () => {
    const result = coachProfileSchema.safeParse({
      headline: "fuck this coach",
      bio: "",
      formats: [],
      links: [],
      serviceTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profane bio", () => {
    const result = coachProfileSchema.safeParse({
      headline: "Great VGC coach",
      bio: "I am the shit at teambuilding",
      formats: [],
      links: [],
      serviceTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profane format entry", () => {
    const result = coachProfileSchema.safeParse({
      headline: "VGC coach",
      bio: "I help players.",
      formats: ["fuck-reg-h"],
      links: [],
      serviceTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profane link label", () => {
    const result = coachProfileSchema.safeParse({
      headline: "VGC coach",
      bio: "I help players.",
      formats: [],
      links: [{ label: "fuck this", url: "https://x.com/me" }],
      serviceTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty headline and bio (defaults)", () => {
    const result = coachProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headline).toBe("");
      expect(result.data.bio).toBe("");
      expect(result.data.formats).toEqual([]);
      expect(result.data.links).toEqual([]);
      expect(result.data.serviceTypes).toEqual([]);
    }
  });
});
