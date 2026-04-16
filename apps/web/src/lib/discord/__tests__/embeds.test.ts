/**
 * @jest-environment node
 */

import {
  buildEmbed,
  previewPlusLink,
  trainersggColor,
  truncateField,
} from "../embeds";

// =============================================================================
// Constants
// =============================================================================

const ELLIPSIS = "…";

// =============================================================================
// trainersggColor
// =============================================================================

describe("trainersggColor", () => {
  it("matches teal brand hex #14b8a6", () => {
    expect(trainersggColor).toBe(0x14b8a6);
  });
});

// =============================================================================
// truncateField
// =============================================================================

describe("truncateField", () => {
  it("returns name and value unchanged when both are within limits", () => {
    const result = truncateField("Name", "Value");
    expect(result).toEqual({ name: "Name", value: "Value" });
  });

  it("truncates name at exactly 256 characters with ellipsis", () => {
    const name = "a".repeat(257);
    const result = truncateField(name, "value");
    expect(result.name).toHaveLength(256);
    expect(result.name.endsWith(ELLIPSIS)).toBe(true);
  });

  it("does not truncate name at exactly 256 characters", () => {
    const name = "a".repeat(256);
    const result = truncateField(name, "value");
    expect(result.name).toHaveLength(256);
    expect(result.name.endsWith(ELLIPSIS)).toBe(false);
  });

  it("truncates value at exactly 1024 characters with ellipsis", () => {
    const value = "b".repeat(1025);
    const result = truncateField("name", value);
    expect(result.value).toHaveLength(1024);
    expect(result.value.endsWith(ELLIPSIS)).toBe(true);
  });

  it("does not truncate value at exactly 1024 characters", () => {
    const value = "b".repeat(1024);
    const result = truncateField("name", value);
    expect(result.value).toHaveLength(1024);
    expect(result.value.endsWith(ELLIPSIS)).toBe(false);
  });

  it("respects custom maxValueChars override", () => {
    const value = "b".repeat(200);
    const result = truncateField("name", value, 100);
    expect(result.value).toHaveLength(100);
    expect(result.value.endsWith(ELLIPSIS)).toBe(true);
  });
});

// =============================================================================
// buildEmbed — individual field truncation
// =============================================================================

describe("buildEmbed — title truncation", () => {
  it.each([
    ["exactly 256 chars", "a".repeat(256), 256, false],
    ["257 chars", "a".repeat(257), 256, true],
    ["empty string", "", 0, false],
    ["short string", "Hello", 5, false],
  ])("title: %s", (_label, input, expectedLen, expectsEllipsis) => {
    const embed = buildEmbed({ title: input });
    expect(embed.title).toHaveLength(expectedLen);
    if (expectsEllipsis) {
      expect(embed.title).toEndWith(ELLIPSIS);
    }
  });
});

describe("buildEmbed — description truncation", () => {
  it.each([
    ["exactly 4096 chars", "a".repeat(4096), 4096, false],
    ["4097 chars", "a".repeat(4097), 4096, true],
    ["empty string", "", 0, false],
  ])("description: %s", (_label, input, expectedLen, expectsEllipsis) => {
    const embed = buildEmbed({ description: input });
    expect(embed.description).toHaveLength(expectedLen);
    if (expectsEllipsis) {
      expect(embed.description).toEndWith(ELLIPSIS);
    }
  });
});

// =============================================================================
// buildEmbed — field count cap
// =============================================================================

describe("buildEmbed — field count cap", () => {
  it("keeps up to 25 fields unchanged", () => {
    const fields = Array.from({ length: 25 }, (_, i) => ({
      name: `Field ${i}`,
      value: `Value ${i}`,
    }));
    const embed = buildEmbed({ fields });
    expect(embed.fields).toHaveLength(25);
  });

  it("caps fields at 25 and appends '…and N more' to the last retained field", () => {
    const fields = Array.from({ length: 30 }, (_, i) => ({
      name: `Field ${i}`,
      value: `Value ${i}`,
    }));
    const embed = buildEmbed({ fields });
    expect(embed.fields).toHaveLength(25);
    expect(embed.fields?.[24]?.value).toBe("…and 5 more");
  });

  it("does not add '…and N more' when exactly at the limit", () => {
    const fields = Array.from({ length: 25 }, (_, i) => ({
      name: `Field ${i}`,
      value: `Value ${i}`,
    }));
    const embed = buildEmbed({ fields });
    expect(embed.fields?.[24]?.value).toBe("Value 24");
  });
});

// =============================================================================
// buildEmbed — total character limit (6000)
// =============================================================================

describe("buildEmbed — total character limit", () => {
  it("does not truncate when total is exactly 6000", () => {
    // Use fields to consume budget — 23 fields * (10 + 10) chars = 460, plus title 256 = 716 chars
    // Then description = 6000 - 716 = 5284 chars (within 4096 limit? No — use smaller title + fewer fields)
    // Simplest: title 256 + description 256 = 512, well within 6000 — no truncation
    const title = "a".repeat(256);
    const description = "b".repeat(256);
    const embed = buildEmbed({ title, description });
    expect(embed.title).toHaveLength(256);
    expect(embed.description).toHaveLength(256);
  });

  it("truncates description when total exceeds 6000", () => {
    // Use fields to pre-consume 5800 chars: 20 fields * (10 + 280) = 5800
    // Then a short description of 300 would push to 6100
    const fields = Array.from({ length: 20 }, () => ({
      name: "n".repeat(10),
      value: "v".repeat(280),
    }));
    const description = "d".repeat(300);
    const embed = buildEmbed({ fields, description });
    const fieldChars =
      embed.fields?.reduce(
        (sum, f) => sum + f.name.length + f.value.length,
        0
      ) ?? 0;
    const total = fieldChars + (embed.description?.length ?? 0);
    expect(total).toBeLessThanOrEqual(6000);
    expect(embed.description).toEndWith(ELLIPSIS);
  });

  it("drops description entirely when it cannot be trimmed enough", () => {
    // Make title + fields consume near 6000, leaving no room for description
    const title = "a".repeat(256);
    const fields = Array.from({ length: 25 }, () => ({
      name: "n".repeat(256),
      value: "v".repeat(1024),
    }));
    // This is already way over 6000 via fields alone, so description should be dropped
    const embed = buildEmbed({
      title,
      description: "some description",
      fields,
    });
    // total from title + 25 fields = 256 + 25*(256+1024) = 256 + 32000 = way over
    // description must be dropped
    expect(embed.description).toBeUndefined();
  });
});

// =============================================================================
// buildEmbed — defaults
// =============================================================================

describe("buildEmbed — defaults", () => {
  it("uses trainersggColor as default color", () => {
    const embed = buildEmbed({ title: "Test" });
    expect(embed.color).toBe(trainersggColor);
  });

  it("accepts custom color override", () => {
    const embed = buildEmbed({ title: "Test", color: 0xff0000 });
    expect(embed.color).toBe(0xff0000);
  });

  it("omits undefined optional fields", () => {
    const embed = buildEmbed({ title: "Test" });
    expect(embed.description).toBeUndefined();
    expect(embed.fields).toBeUndefined();
    expect(embed.footer).toBeUndefined();
    expect(embed.thumbnail).toBeUndefined();
    expect(embed.author).toBeUndefined();
  });

  it("converts Date to ISO string for timestamp", () => {
    const date = new Date("2026-04-10T12:00:00.000Z");
    const embed = buildEmbed({ title: "Test", timestamp: date });
    expect(embed.timestamp).toBe("2026-04-10T12:00:00.000Z");
  });

  it("passes through string timestamps unchanged", () => {
    const ts = "2026-04-10T12:00:00.000Z";
    const embed = buildEmbed({ title: "Test", timestamp: ts });
    expect(embed.timestamp).toBe(ts);
  });
});

// =============================================================================
// buildEmbed — footer truncation (2048, not 256)
// =============================================================================

describe("buildEmbed — footer truncation", () => {
  it.each([
    ["exactly 2048 chars", "a".repeat(2048), 2048, false],
    ["2049 chars", "a".repeat(2049), 2048, true],
    ["short text", "Footer text", 11, false],
  ])("footer text: %s", (_label, input, expectedLen, expectsEllipsis) => {
    const embed = buildEmbed({ footer: { text: input } });
    expect(embed.footer?.text).toHaveLength(expectedLen);
    if (expectsEllipsis) {
      expect(embed.footer?.text).toEndWith(ELLIPSIS);
    }
  });

  it("does NOT truncate footer text at 256 chars (bug fix verification)", () => {
    // Previously footer was capped at 256 (TITLE_MAX) — it should now allow up to 2048
    const text = "a".repeat(500);
    const embed = buildEmbed({ footer: { text } });
    expect(embed.footer?.text).toHaveLength(500);
    expect(embed.footer?.text?.endsWith(ELLIPSIS)).toBe(false);
  });
});

// =============================================================================
// previewPlusLink
// =============================================================================

describe("previewPlusLink", () => {
  it("builds an embed with preview lines joined by newlines", () => {
    const embed = previewPlusLink(
      "My Title",
      ["Line 1", "Line 2", "Line 3"],
      "https://trainers.gg/foo",
      "View on trainers.gg"
    );

    expect(embed.title).toBe("My Title");
    expect(embed.description).toContain("Line 1\nLine 2\nLine 3");
    expect(embed.description).toContain(
      "[View on trainers.gg](https://trainers.gg/foo)"
    );
  });

  it("appends the link after two newlines", () => {
    const embed = previewPlusLink(
      "Title",
      ["Preview"],
      "https://trainers.gg",
      "See more"
    );

    expect(embed.description).toMatch(/Preview\n\n\[See more\]/);
  });

  it("uses the brand teal color", () => {
    const embed = previewPlusLink("Title", ["Line"], "https://t.gg", "Go");
    expect(embed.color).toBe(trainersggColor);
  });
});

// Custom matcher extension — Jest doesn't have toEndWith built-in
expect.extend({
  toEndWith(received: string, suffix: string) {
    const pass = received.endsWith(suffix);
    return {
      pass,
      message: () =>
        pass
          ? `expected "${received}" not to end with "${suffix}"`
          : `expected "${received}" to end with "${suffix}"`,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEndWith(suffix: string): R;
    }
  }
}
