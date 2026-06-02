/** @jest-environment node */
import { grantCoachStatus, revokeCoachStatus, updateCoachProfile } from "../coach";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import { type TypedClient } from "../../client";

describe("grantCoachStatus", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("sets is_coach=true, upserts a coach_profiles row, and writes an audit log", async () => {
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const coachUpsert = jest.fn().mockResolvedValue({ error: null });
    const auditInsert = jest.fn().mockResolvedValue({ error: null });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      if (table === "coach_profiles") return { upsert: coachUpsert };
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await grantCoachStatus(
      mockClient as unknown as TypedClient,
      "user-1",
      "admin-9"
    );

    expect(usersUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(coachUpsert).toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.coach_granted",
        actor_user_id: "admin-9",
      })
    );
  });

  it("throws when the users update fails", async () => {
    const dbError = new Error("db error");
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: dbError });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      return {};
    });

    await expect(
      grantCoachStatus(mockClient as unknown as TypedClient, "user-1", "admin-9")
    ).rejects.toThrow("db error");
  });

  it("throws when the coach_profiles upsert fails", async () => {
    const dbError = new Error("upsert error");
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const coachUpsert = jest.fn().mockResolvedValue({ error: dbError });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      if (table === "coach_profiles") return { upsert: coachUpsert };
      return {};
    });

    await expect(
      grantCoachStatus(mockClient as unknown as TypedClient, "user-1", "admin-9")
    ).rejects.toThrow("upsert error");
  });
});

describe("revokeCoachStatus", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("sets is_coach=false and writes an audit log", async () => {
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const auditInsert = jest.fn().mockResolvedValue({ error: null });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await revokeCoachStatus(
      mockClient as unknown as TypedClient,
      "user-1",
      "admin-9"
    );

    expect(usersUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.coach_revoked",
        actor_user_id: "admin-9",
      })
    );
  });

  it("includes reason in audit metadata when provided", async () => {
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const auditInsert = jest.fn().mockResolvedValue({ error: null });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await revokeCoachStatus(
      mockClient as unknown as TypedClient,
      "user-1",
      "admin-9",
      "violates conduct policy"
    );

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.coach_revoked" })
    );
  });

  it("throws when the users update fails", async () => {
    const dbError = new Error("update error");
    const usersUpdateEq = jest.fn().mockResolvedValue({ error: dbError });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "users")
        return { update: jest.fn().mockReturnValue({ eq: usersUpdateEq }) };
      return {};
    });

    await expect(
      revokeCoachStatus(
        mockClient as unknown as TypedClient,
        "user-1",
        "admin-9"
      )
    ).rejects.toThrow("update error");
  });
});

describe("updateCoachProfile", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("updates coach_profiles with the provided input fields", async () => {
    const profileUpdateEq = jest.fn().mockResolvedValue({ error: null });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "coach_profiles")
        return { update: jest.fn().mockReturnValue({ eq: profileUpdateEq }) };
      return {};
    });

    await updateCoachProfile(mockClient as unknown as TypedClient, "user-1", {
      headline: "VGC Champion",
      bio: "10 years of competitive battling",
      formats: ["VGC 2024"],
      links: [{ label: "Twitter", url: "https://x.com/coach" }],
      serviceTypes: ["live", "replay_review"],
    });

    expect(profileUpdateEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when the update fails", async () => {
    const dbError = new Error("update failed");
    const profileUpdateEq = jest.fn().mockResolvedValue({ error: dbError });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "coach_profiles")
        return { update: jest.fn().mockReturnValue({ eq: profileUpdateEq }) };
      return {};
    });

    await expect(
      updateCoachProfile(mockClient as unknown as TypedClient, "user-1", {
        headline: "",
        bio: "",
        formats: [],
        links: [],
        serviceTypes: [],
      })
    ).rejects.toThrow("update failed");
  });
});
