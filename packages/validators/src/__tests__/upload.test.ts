import {
  imageUploadSchema,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from "../upload";

// Helper to create a file-like object with size and type
function createTestFile(type: string, size: number) {
  return { size, type };
}

describe("imageUploadSchema", () => {
  it.each(ALLOWED_IMAGE_TYPES)("accepts a valid %s file", (mimeType) => {
    const file = createTestFile(mimeType, 1024);
    const result = imageUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("accepts a file at exactly the size limit", () => {
    const file = createTestFile("image/jpeg", MAX_IMAGE_SIZE);
    const result = imageUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("rejects a file exceeding the size limit", () => {
    const file = createTestFile("image/jpeg", MAX_IMAGE_SIZE + 1);
    const result = imageUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/smaller than 2 MB/);
    }
  });

  it("rejects an empty file", () => {
    const file = createTestFile("image/jpeg", 0);
    const result = imageUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/empty/i);
    }
  });

  it.each(["application/pdf", "text/plain", "video/mp4", "image/svg+xml"])(
    "rejects disallowed MIME type %s",
    (mimeType) => {
      const file = createTestFile(mimeType, 1024);
      const result = imageUploadSchema.safeParse({ file });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(
          /JPEG, PNG, WebP, or GIF/
        );
      }
    }
  );

  it("rejects when file is missing", () => {
    const result = imageUploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("constants", () => {
  it("MAX_IMAGE_SIZE is 2 MiB", () => {
    expect(MAX_IMAGE_SIZE).toBe(2 * 1024 * 1024);
  });

  it("ALLOWED_IMAGE_TYPES contains expected MIME types", () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
  });
});
