/** @jest-environment node */
import { writeAuditLog } from "../audit-log";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import { type ServiceRoleClient } from "../../client";

describe("writeAuditLog", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("inserts the payload into audit_log and resolves on success", async () => {
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await expect(
      writeAuditLog(mockClient as unknown as ServiceRoleClient, {
        action: "admin.coach_granted",
        actor_user_id: "admin-1",
        metadata: { target_user_id: "user-2" },
      })
    ).resolves.toBeUndefined();

    expect(mockClient.from).toHaveBeenCalledWith("audit_log");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.coach_granted",
        actor_user_id: "admin-1",
      })
    );
  });

  it("throws with action context when the insert returns an error", async () => {
    const auditInsert = jest
      .fn()
      .mockResolvedValue({ error: { message: "new row violates RLS policy" } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await expect(
      writeAuditLog(mockClient as unknown as ServiceRoleClient, {
        action: "admin.sudo_activated",
        actor_user_id: "admin-1",
      })
    ).rejects.toThrow(
      "audit_log insert failed [action=admin.sudo_activated]: new row violates RLS policy"
    );
  });

  it("includes the action name in the thrown error message for easy debugging", async () => {
    const auditInsert = jest
      .fn()
      .mockResolvedValue({ error: { message: "connection timeout" } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await expect(
      writeAuditLog(mockClient as unknown as ServiceRoleClient, {
        action: "admin.org_request_approved",
        actor_user_id: "admin-1",
        community_id: "community-5",
      })
    ).rejects.toThrow("admin.org_request_approved");
  });

  it("passes through optional fields (community_id, tournament_id, etc.)", async () => {
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === "audit_log") return { insert: auditInsert };
      return {};
    });

    await writeAuditLog(mockClient as unknown as ServiceRoleClient, {
      action: "admin.org_request_approved",
      actor_user_id: "admin-1",
      community_id: "community-5",
      metadata: { request_id: 42 },
    });

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.org_request_approved",
        community_id: "community-5",
        metadata: { request_id: 42 },
      })
    );
  });
});
