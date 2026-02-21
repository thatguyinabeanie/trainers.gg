import { positiveIntSchema, uuidSchema, pdsStatusSchema } from "../common";

describe("positiveIntSchema", () => {
  it.each(["1", "42", "100"])(
    "coerces string %s to a positive integer",
    (v) => {
      const result = positiveIntSchema.safeParse(v);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(Number(v));
    }
  );

  it.each([1, 42, 100])("accepts number %d directly", (v) => {
    expect(positiveIntSchema.safeParse(v).success).toBe(true);
  });

  it.each(["0", "-1", "abc", "", "1.5", "NaN"])(
    "rejects invalid value %s",
    (v) => {
      expect(positiveIntSchema.safeParse(v).success).toBe(false);
    }
  );

  it("rejects null and undefined", () => {
    expect(positiveIntSchema.safeParse(null).success).toBe(false);
    expect(positiveIntSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid UUID", () => {
    expect(
      uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success
    ).toBe(true);
  });

  it.each(["not-a-uuid", "", "550e8400-e29b-41d4-a716"])(
    "rejects invalid value %s",
    (v) => {
      expect(uuidSchema.safeParse(v).success).toBe(false);
    }
  );
});

describe("pdsStatusSchema", () => {
  it.each(["pending", "active", "failed", "suspended", "external"])(
    "accepts valid status %s",
    (v) => {
      expect(pdsStatusSchema.safeParse(v).success).toBe(true);
    }
  );

  it.each(["invalid", "", "ACTIVE", "Pending"])(
    "rejects invalid value %s",
    (v) => {
      expect(pdsStatusSchema.safeParse(v).success).toBe(false);
    }
  );
});
