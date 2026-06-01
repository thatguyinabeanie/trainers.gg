import { describe, it, expect } from "@jest/globals";

import { cellClasses } from "../shared";

describe("cellClasses", () => {
  it("exports all expected keys", () => {
    expect(Object.keys(cellClasses).sort()).toEqual([
      "formLabel",
      "formRow",
      "formValue",
      "midFormCell",
      "midFormLbl",
      "midFormVal",
      "midMegaChip",
    ]);
  });

  it("all values are non-empty strings", () => {
    for (const value of Object.values(cellClasses)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
