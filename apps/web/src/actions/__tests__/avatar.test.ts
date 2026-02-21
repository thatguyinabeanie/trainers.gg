/**
 * @jest-environment node
 */

// Mock next/cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Supabase client
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockStorageFrom = jest.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  storage: { from: mockStorageFrom },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

// Mock @trainers/supabase mutations
const mockUpdateAlt = jest.fn();
jest.mock("@trainers/supabase", () => ({
  updateAlt: (...args: unknown[]) => mockUpdateAlt(...args),
  STORAGE_BUCKETS: { AVATARS: "avatars" },
  getAvatarPath: jest.fn(() => "user-123/1234-abc.jpg"),
  uploadFile: jest.fn(
    async () =>
      "https://abc.supabase.co/storage/v1/object/public/avatars/user-123/1234-abc.jpg"
  ),
  deleteFile: jest.fn(async () => undefined),
  extractPathFromUrl: jest.fn((url: string) => {
    if (url.includes("/storage/v1/object/public/avatars/")) {
      return url.split("/storage/v1/object/public/avatars/")[1] ?? null;
    }
    return null;
  }),
}));

import { uploadAltAvatar, removeAltAvatar } from "../avatar";

// Helper to create a test File
function createTestFile(
  type = "image/jpeg",
  size = 1024,
  name = "test.jpg"
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// Helper to set up authenticated user who owns the alt
function setupAuthenticatedOwner(options?: { avatarUrl?: string | null }) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: "user-123",
            avatar_url: options?.avatarUrl ?? null,
          },
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe("uploadAltAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads a valid file and returns the avatar URL", async () => {
    setupAuthenticatedOwner();
    mockUpdateAlt.mockResolvedValue({ success: true });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadAltAvatar(1, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toContain("avatars");
    }
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadAltAvatar(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns an error when user does not own the alt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "other-user", avatar_url: null },
          }),
        }),
      }),
    });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadAltAvatar(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own alt/i);
    }
  });

  it("returns an error when no file is provided", async () => {
    const formData = new FormData();

    const result = await uploadAltAvatar(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/file/i);
    }
  });

  it("rejects an invalid alt ID", async () => {
    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadAltAvatar(-1, formData);

    expect(result.success).toBe(false);
  });

  it("cleans up old avatar when replacing", async () => {
    const oldUrl =
      "https://abc.supabase.co/storage/v1/object/public/avatars/user-123/old-file.jpg";
    setupAuthenticatedOwner({ avatarUrl: oldUrl });
    mockUpdateAlt.mockResolvedValue({ success: true });

    const { deleteFile } = jest.requireMock("@trainers/supabase") as {
      deleteFile: jest.Mock;
    };

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadAltAvatar(1, formData);

    expect(result.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(
      mockSupabaseClient,
      "avatars",
      "user-123/old-file.jpg"
    );
  });
});

describe("removeAltAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes the avatar successfully", async () => {
    setupAuthenticatedOwner({
      avatarUrl:
        "https://abc.supabase.co/storage/v1/object/public/avatars/user-123/file.jpg",
    });

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(true);
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns an error when user does not own the alt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "other-user", avatar_url: null },
          }),
        }),
      }),
    });

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own alt/i);
    }
  });

  it("rejects an invalid alt ID", async () => {
    const result = await removeAltAvatar(0);

    expect(result.success).toBe(false);
  });
});
