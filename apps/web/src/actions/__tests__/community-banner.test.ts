/**
 * @jest-environment node
 */

// Mock next/cache
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

// Mock Supabase clients
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

const mockStorageFrom = jest.fn();
const mockStorageClient = {
  storage: { from: mockStorageFrom },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
  createStorageClient: jest.fn(async () => mockStorageClient),
}));

// Mock @trainers/supabase storage utilities
jest.mock("@trainers/supabase", () => ({
  STORAGE_BUCKETS: { UPLOADS: "uploads" },
  getUploadPath: jest.fn(() => "user-123/1234-abc.jpg"),
  uploadFile: jest.fn(
    async () =>
      "https://abc.supabase.co/storage/v1/object/public/uploads/communities/1/banner_1234-abc.jpg"
  ),
  deleteFile: jest.fn(async () => undefined),
  extractPathFromUrl: jest.fn((url: string) => {
    if (url.includes("/storage/v1/object/public/uploads/")) {
      return url.split("/storage/v1/object/public/uploads/")[1] ?? null;
    }
    return null;
  }),
}));

import {
  uploadCommunityBanner,
  removeCommunityBanner,
} from "../community-banner";

// Helper to create a test File
function createTestFile(
  type = "image/jpeg",
  size = 1024,
  name = "banner.jpg"
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// Helper to set up authenticated user who owns the org
function setupAuthenticatedOwner(options?: { bannerUrl?: string | null }) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            owner_user_id: "user-123",
            banner_url: options?.bannerUrl ?? null,
            slug: "test-community",
          },
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe("uploadCommunityBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads a valid file and returns the banner URL", async () => {
    setupAuthenticatedOwner();

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bannerUrl).toContain("uploads");
    }
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns an error when user does not own the org", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              owner_user_id: "other-user",
              banner_url: null,
              slug: "test-community",
            },
          }),
        }),
      }),
    });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own community/i);
    }
  });

  it("returns an error when no file is provided", async () => {
    const formData = new FormData();

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/file/i);
    }
  });

  it("rejects an invalid org ID", async () => {
    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(-1, formData);

    expect(result.success).toBe(false);
  });

  it("returns error when org not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  it("returns error when DB update fails", async () => {
    setupAuthenticatedOwner();
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            owner_user_id: "user-123",
            banner_url: null,
            slug: "test-community",
          },
        }),
      }),
    };
    const updateChain = {
      eq: jest.fn().mockResolvedValue({
        error: { message: "DB update error" },
      }),
    };
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      update: jest.fn().mockReturnValue(updateChain),
    });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/DB update error/i);
    }
  });

  it("cleans up old banner when replacing", async () => {
    const oldUrl =
      "https://abc.supabase.co/storage/v1/object/public/uploads/communities/1/banner_old-file.jpg";
    setupAuthenticatedOwner({ bannerUrl: oldUrl });

    const { deleteFile } = jest.requireMock("@trainers/supabase") as {
      deleteFile: jest.Mock;
    };

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadCommunityBanner(1, formData);

    expect(result.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(
      mockStorageClient,
      "uploads",
      "communities/1/banner_old-file.jpg"
    );
  });
});

describe("removeCommunityBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes the banner successfully", async () => {
    setupAuthenticatedOwner({
      bannerUrl:
        "https://abc.supabase.co/storage/v1/object/public/uploads/communities/1/banner_file.jpg",
    });

    const result = await removeCommunityBanner(1);

    expect(result.success).toBe(true);
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeCommunityBanner(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns an error when user does not own the org", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              owner_user_id: "other-user",
              banner_url: null,
              slug: "test-community",
            },
          }),
        }),
      }),
    });

    const result = await removeCommunityBanner(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own community/i);
    }
  });

  it("returns error when community not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    const result = await removeCommunityBanner(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  it("returns error when DB update fails", async () => {
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            owner_user_id: "user-123",
            banner_url:
              "https://abc.supabase.co/storage/v1/object/public/uploads/communities/1/banner_file.jpg",
            slug: "test-community",
          },
        }),
      }),
    };
    const updateChain = {
      eq: jest.fn().mockResolvedValue({
        error: { message: "DB update error" },
      }),
    };
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      update: jest.fn().mockReturnValue(updateChain),
    });

    const result = await removeCommunityBanner(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/DB update error/i);
    }
  });

  it("rejects an invalid org ID", async () => {
    const result = await removeCommunityBanner(0);

    expect(result.success).toBe(false);
  });
});
