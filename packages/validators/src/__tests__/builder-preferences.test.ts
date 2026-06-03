import {
  builderPreferencesSchema,
  DEFAULT_BUILDER_PREFERENCES,
} from "../builder-preferences";

describe("builderPreferencesSchema", () => {
  it("applies defaults for an empty object", () => {
    const result = builderPreferencesSchema.parse({});
    expect(result).toEqual(DEFAULT_BUILDER_PREFERENCES);
  });

  it("defaults speedTiers to dialog + no open-on-load", () => {
    expect(DEFAULT_BUILDER_PREFERENCES.speedTiers.defaultView).toBe("dialog");
    expect(DEFAULT_BUILDER_PREFERENCES.speedTiers.openOnLoad).toBe(false);
  });

  it("accepts a valid sidepane preference", () => {
    const result = builderPreferencesSchema.parse({
      speedTiers: { defaultView: "sidepane", openOnLoad: true },
    });
    expect(result.speedTiers).toEqual({
      defaultView: "sidepane",
      openOnLoad: true,
    });
  });

  it("rejects an invalid defaultView", () => {
    const result = builderPreferencesSchema.safeParse({
      speedTiers: { defaultView: "popover", openOnLoad: false },
    });
    expect(result.success).toBe(false);
  });
});
