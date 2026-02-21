/**
 * @jest-environment node
 */

// Mock next/cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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
      "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/org-logos/1/1234-abc.jpg"
  ),
  deleteFile: jest.fn(async () => undefined),
  extractPathFromUrl: jest.fn((url: string) => {
    if (url.includes("/storage/v1/object/public/uploads/")) {
      return url.split("/storage/v1/object/public/uploads/")[1] ?? null;
    }
    return null;
  }),
}));

import { uploadOrgLogo, removeOrgLogo } from "../organization-logo";

// Helper to create a test File
function createTestFile(
  type = "image/jpeg",
  size = 1024,
  name = "test.jpg"
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// Helper to set up authenticated user who owns the org
function setupAuthenticatedOwner(options?: { logoUrl?: string | null }) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            owner_user_id: "user-123",
            logo_url: options?.logoUrl ?? null,
          },
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe("uploadOrgLogo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads a valid file and returns the logo URL", async () => {
    setupAuthenticatedOwner();

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadOrgLogo(1, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logoUrl).toContain("uploads");
    }
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadOrgLogo(1, formData);

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
            data: { owner_user_id: "other-user", logo_url: null },
          }),
        }),
      }),
    });

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadOrgLogo(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own organization/i);
    }
  });

  it("returns an error when no file is provided", async () => {
    const formData = new FormData();

    const result = await uploadOrgLogo(1, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/file/i);
    }
  });

  it("rejects an invalid org ID", async () => {
    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadOrgLogo(-1, formData);

    expect(result.success).toBe(false);
  });

  it("cleans up old logo when replacing", async () => {
    const oldUrl =
      "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/org-logos/1/old-file.jpg";
    setupAuthenticatedOwner({ logoUrl: oldUrl });

    const { deleteFile } = jest.requireMock("@trainers/supabase") as {
      deleteFile: jest.Mock;
    };

    const formData = new FormData();
    formData.append("file", createTestFile());

    const result = await uploadOrgLogo(1, formData);

    expect(result.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(
      mockStorageClient,
      "uploads",
      "user-123/org-logos/1/old-file.jpg"
    );
  });
});

describe("removeOrgLogo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes the logo successfully", async () => {
    setupAuthenticatedOwner({
      logoUrl:
        "https://abc.supabase.co/storage/v1/object/public/uploads/user-123/org-logos/1/file.jpg",
    });

    const result = await removeOrgLogo(1);

    expect(result.success).toBe(true);
  });

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeOrgLogo(1);

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
            data: { owner_user_id: "other-user", logo_url: null },
          }),
        }),
      }),
    });

    const result = await removeOrgLogo(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own organization/i);
    }
  });

  it("rejects an invalid org ID", async () => {
    const result = await removeOrgLogo(0);

    expect(result.success).toBe(false);
  });
});
