import { normalizeLimitlessStatus } from "../limitless-status";

describe("normalizeLimitlessStatus", () => {
  it.each([
    ["completed", "complete"],
    ["queued", "in-progress"],
    ["importing", "in-progress"],
    ["failed", "failed"],
    ["unknown", "pending"],
    [null, "pending"],
  ])("maps %p → %p", (input, expected) => {
    expect(normalizeLimitlessStatus(input)).toBe(expected);
  });
});
