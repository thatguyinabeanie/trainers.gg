import { getAvatarPath, extractPathFromUrl, STORAGE_BUCKETS } from "../storage";

describe("getAvatarPath", () => {
  it("generates a path in the user's folder", () => {
    const path = getAvatarPath("user-123", "photo.png");
    expect(path).toMatch(/^user-123\/\d+-[a-z0-9]+\.png$/);
  });

  it("normalizes the extension to lowercase", () => {
    const path = getAvatarPath("user-123", "photo.JPG");
    expect(path).toMatch(/\.jpg$/);
  });

  it("defaults to jpg when no extension", () => {
    const path = getAvatarPath("user-123", "photo");
    expect(path).toMatch(/\.jpg$/);
  });

  it("generates unique paths on successive calls", () => {
    const path1 = getAvatarPath("user-123", "photo.png");
    const path2 = getAvatarPath("user-123", "photo.png");
    expect(path1).not.toBe(path2);
  });
});

describe("extractPathFromUrl", () => {
  const bucket = STORAGE_BUCKETS.AVATARS;

  it("extracts the path from a valid Supabase storage URL", () => {
    const url =
      "https://abc.supabase.co/storage/v1/object/public/avatars/user-id/1234-abc.jpg";
    expect(extractPathFromUrl(url, bucket)).toBe("user-id/1234-abc.jpg");
  });

  it("extracts the path from a local dev URL", () => {
    const url =
      "http://127.0.0.1:54321/storage/v1/object/public/avatars/user-id/file.png";
    expect(extractPathFromUrl(url, bucket)).toBe("user-id/file.png");
  });

  it("returns null for a URL from a different bucket", () => {
    const url =
      "https://abc.supabase.co/storage/v1/object/public/other-bucket/file.jpg";
    expect(extractPathFromUrl(url, bucket)).toBeNull();
  });

  it("returns null for an external URL", () => {
    const url = "https://cdn.discord.com/avatars/123/abc.png";
    expect(extractPathFromUrl(url, bucket)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractPathFromUrl("", bucket)).toBeNull();
  });
});

describe("STORAGE_BUCKETS", () => {
  it("has an AVATARS constant", () => {
    expect(STORAGE_BUCKETS.AVATARS).toBe("avatars");
  });
});
