/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client
const mockServiceClient = {};
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the Supabase query functions
jest.mock("@trainers/supabase", () => ({
  createFeatureFlag: jest.fn(),
  updateFeatureFlag: jest.fn(),
  deleteFeatureFlag: jest.fn(),
  createAnnouncement: jest.fn(),
  updateAnnouncement: jest.fn(),
  deleteAnnouncement: jest.fn(),
}));

// Import after mocks are declared
import {
  createFlagAction,
  updateFlagAction,
  deleteFlagAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@trainers/supabase";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockCreateFeatureFlag = createFeatureFlag as jest.Mock;
const mockUpdateFeatureFlag = updateFeatureFlag as jest.Mock;
const mockDeleteFeatureFlag = deleteFeatureFlag as jest.Mock;
const mockCreateAnnouncement = createAnnouncement as jest.Mock;
const mockUpdateAnnouncement = updateAnnouncement as jest.Mock;
const mockDeleteAnnouncement = deleteAnnouncement as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";

// --- Feature Flag Action Tests ---

describe("createFlagAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockCreateFeatureFlag.mockResolvedValue(undefined);
  });

  it("creates a feature flag successfully", async () => {
    const flagData = {
      key: "new_feature",
      description: "A new feature flag",
      enabled: true,
    };

    const result = await createFlagAction(flagData);

    expect(result).toEqual({ success: true });
    expect(mockCreateFeatureFlag).toHaveBeenCalledWith(
      mockServiceClient,
      flagData,
      ADMIN_USER_ID
    );
  });

  it("creates a flag with minimal data (key only)", async () => {
    const flagData = { key: "minimal_flag" };

    const result = await createFlagAction(flagData);

    expect(result).toEqual({ success: true });
    expect(mockCreateFeatureFlag).toHaveBeenCalledWith(
      mockServiceClient,
      flagData,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await createFlagAction({ key: "test" });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockCreateFeatureFlag).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockCreateFeatureFlag.mockRejectedValue(
      new Error("Duplicate key constraint")
    );

    const result = await createFlagAction({ key: "duplicate_key" });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockCreateFeatureFlag.mockRejectedValue("string error");

    const result = await createFlagAction({ key: "test" });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("updateFlagAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockUpdateFeatureFlag.mockResolvedValue(undefined);
  });

  it("updates a feature flag successfully", async () => {
    const updateData = { description: "Updated description", enabled: false };

    const result = await updateFlagAction(1, updateData);

    expect(result).toEqual({ success: true });
    expect(mockUpdateFeatureFlag).toHaveBeenCalledWith(
      mockServiceClient,
      1,
      updateData,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await updateFlagAction(1, { enabled: true });

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockUpdateFeatureFlag).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockUpdateFeatureFlag.mockRejectedValue(new Error("Flag not found"));

    const result = await updateFlagAction(999, { enabled: true });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockUpdateFeatureFlag.mockRejectedValue(42);

    const result = await updateFlagAction(1, { enabled: true });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("deleteFlagAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockDeleteFeatureFlag.mockResolvedValue(undefined);
  });

  it("deletes a feature flag successfully", async () => {
    const result = await deleteFlagAction(1);

    expect(result).toEqual({ success: true });
    expect(mockDeleteFeatureFlag).toHaveBeenCalledWith(
      mockServiceClient,
      1,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await deleteFlagAction(1);

    expect(result).toEqual({ success: false, error: "Admin access required" });
    expect(mockDeleteFeatureFlag).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockDeleteFeatureFlag.mockRejectedValue(new Error("Flag not found"));

    const result = await deleteFlagAction(999);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockDeleteFeatureFlag.mockRejectedValue(null);

    const result = await deleteFlagAction(1);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

// --- Announcement Action Tests ---

describe("createAnnouncementAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockCreateAnnouncement.mockResolvedValue(undefined);
  });

  it("creates an announcement successfully", async () => {
    const announcementData = {
      title: "Maintenance Window",
      message: "Servers will be down for maintenance",
      type: "warning" as const,
      is_active: true,
    };

    const result = await createAnnouncementAction(announcementData);

    expect(result).toEqual({ success: true });
    expect(mockCreateAnnouncement).toHaveBeenCalledWith(
      mockServiceClient,
      announcementData,
      ADMIN_USER_ID
    );
  });

  it("creates an announcement with all optional fields", async () => {
    const announcementData = {
      title: "Scheduled Downtime",
      message: "Service will be unavailable",
      type: "error" as const,
      start_at: "2026-03-01T00:00:00Z",
      end_at: "2026-03-01T06:00:00Z",
      is_active: false,
    };

    const result = await createAnnouncementAction(announcementData);

    expect(result).toEqual({ success: true });
    expect(mockCreateAnnouncement).toHaveBeenCalledWith(
      mockServiceClient,
      announcementData,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await createAnnouncementAction({
      title: "Test",
      message: "Test message",
      type: "info",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockCreateAnnouncement).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockCreateAnnouncement.mockRejectedValue(
      new Error("Validation failed: title too long")
    );

    const result = await createAnnouncementAction({
      title: "Test",
      message: "Test",
      type: "info",
    });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockCreateAnnouncement.mockRejectedValue(undefined);

    const result = await createAnnouncementAction({
      title: "Test",
      message: "Test",
      type: "info",
    });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("updateAnnouncementAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockUpdateAnnouncement.mockResolvedValue(undefined);
  });

  it("updates an announcement successfully", async () => {
    const updateData = { title: "Updated Title", is_active: false };

    const result = await updateAnnouncementAction(1, updateData);

    expect(result).toEqual({ success: true });
    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      mockServiceClient,
      1,
      updateData,
      ADMIN_USER_ID
    );
  });

  it("updates an announcement with null end_at to clear the field", async () => {
    const updateData = { end_at: null as string | null };

    const result = await updateAnnouncementAction(1, updateData);

    expect(result).toEqual({ success: true });
    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      mockServiceClient,
      1,
      updateData,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo session expired",
    });

    const result = await updateAnnouncementAction(1, { is_active: true });

    expect(result).toEqual({
      success: false,
      error: "Sudo session expired",
    });
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockUpdateAnnouncement.mockRejectedValue(
      new Error("Announcement not found")
    );

    const result = await updateAnnouncementAction(999, { is_active: true });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockUpdateAnnouncement.mockRejectedValue({ code: 500 });

    const result = await updateAnnouncementAction(1, { is_active: true });

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("deleteAnnouncementAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockDeleteAnnouncement.mockResolvedValue(undefined);
  });

  it("deletes an announcement successfully", async () => {
    const result = await deleteAnnouncementAction(1);

    expect(result).toEqual({ success: true });
    expect(mockDeleteAnnouncement).toHaveBeenCalledWith(
      mockServiceClient,
      1,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await deleteAnnouncementAction(1);

    expect(result).toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(mockDeleteAnnouncement).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws an Error", async () => {
    mockDeleteAnnouncement.mockRejectedValue(
      new Error("Announcement not found")
    );

    const result = await deleteAnnouncementAction(999);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });

  it("returns a generic error for non-Error throwables", async () => {
    mockDeleteAnnouncement.mockRejectedValue(false);

    const result = await deleteAnnouncementAction(1);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});
