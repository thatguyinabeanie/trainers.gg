import {
  getUploadPath,
  extractPathFromUrl,
  getPublicUrl,
  uploadFile,
  deleteFile,
  STORAGE_BUCKETS,
} from "../storage";
import { type TypedClient } from "../client";

// Helper to create a mock Supabase client with storage methods
function createMockStorageClient(overrides?: {
  upload?: jest.Mock;
  getPublicUrl?: jest.Mock;
  remove?: jest.Mock;
}) {
  const upload =
    overrides?.upload ??
    jest.fn().mockResolvedValue({ data: { path: "test" }, error: null });
  const getPublicUrlMock =
    overrides?.getPublicUrl ??
    jest.fn().mockReturnValue({
      data: {
        publicUrl:
          "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/file.jpg",
      },
    });
  const remove =
    overrides?.remove ?? jest.fn().mockResolvedValue({ data: [], error: null });

  return {
    storage: {
      from: jest.fn().mockReturnValue({
        upload,
        getPublicUrl: getPublicUrlMock,
        remove,
      }),
    },
  } as unknown as TypedClient;
}

describe("getUploadPath", () => {
  it("generates a path in the user's folder", () => {
    const path = getUploadPath("user-123", "photo.png");
    expect(path).toMatch(/^user-123\/\d+-[a-z0-9]+\.png$/);
  });

  it("normalizes the extension to lowercase", () => {
    const path = getUploadPath("user-123", "photo.JPG");
    expect(path).toMatch(/\.jpg$/);
  });

  it("defaults to jpg when no extension", () => {
    const path = getUploadPath("user-123", "photo");
    expect(path).toMatch(/\.jpg$/);
  });

  it("generates unique paths on successive calls", () => {
    const path1 = getUploadPath("user-123", "photo.png");
    const path2 = getUploadPath("user-123", "photo.png");
    expect(path1).not.toBe(path2);
  });
});

describe("extractPathFromUrl", () => {
  const bucket = STORAGE_BUCKETS.UPLOADS;

  it("extracts the path from a valid Supabase storage URL", () => {
    const url =
      "https://abc.supabase.co/storage/v1/object/public/uploads/user-id/1234-abc.jpg";
    expect(extractPathFromUrl(url, bucket)).toBe("user-id/1234-abc.jpg");
  });

  it("extracts the path from a local dev URL", () => {
    const url =
      "http://127.0.0.1:54321/storage/v1/object/public/uploads/user-id/file.png";
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
  it("has an UPLOADS constant", () => {
    expect(STORAGE_BUCKETS.UPLOADS).toBe("uploads");
  });
});

describe("getPublicUrl", () => {
  it("returns the public URL from the storage client", () => {
    const expectedUrl =
      "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/file.jpg";
    const client = createMockStorageClient({
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: expectedUrl },
      }),
    });

    const url = getPublicUrl(client, "uploads", "user-123/file.jpg");

    expect(url).toBe(expectedUrl);
    expect(client.storage.from).toHaveBeenCalledWith("uploads");
  });
});

describe("uploadFile", () => {
  const testFile = new File(["test"], "photo.png", { type: "image/png" });

  it("uploads file and returns public URL", async () => {
    const expectedUrl =
      "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/file.jpg";
    const client = createMockStorageClient({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test" }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: expectedUrl },
      }),
    });

    const url = await uploadFile(
      client,
      "uploads",
      "user-123/file.jpg",
      testFile
    );

    expect(url).toBe(expectedUrl);
    const fromMock = client.storage.from as jest.Mock;
    expect(fromMock).toHaveBeenCalledWith("uploads");
    const bucket = fromMock.mock.results[0]!.value;
    expect(bucket.upload).toHaveBeenCalledWith("user-123/file.jpg", testFile, {
      upsert: false,
      contentType: "image/png",
    });
  });

  it("throws when upload fails", async () => {
    const uploadError = new Error("upload failed");
    const client = createMockStorageClient({
      upload: jest.fn().mockResolvedValue({ data: null, error: uploadError }),
    });

    await expect(
      uploadFile(client, "uploads", "user-123/file.jpg", testFile)
    ).rejects.toThrow("upload failed");
  });
});

describe("deleteFile", () => {
  it("deletes file without throwing", async () => {
    const client = createMockStorageClient({
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    await expect(
      deleteFile(client, "uploads", "user-123/file.jpg")
    ).resolves.toBeUndefined();
  });

  it("logs error but does not throw when deletion fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const client = createMockStorageClient({
      remove: jest
        .fn()
        .mockResolvedValue({ data: null, error: new Error("delete failed") }),
    });

    await expect(
      deleteFile(client, "uploads", "user-123/file.jpg")
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[storage] Failed to delete uploads/user-123/file.jpg:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
