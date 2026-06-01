/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(),
  getUserId: jest.fn(),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(),
}));

import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { getSiteConfig, setSiteConfig } from "../site-config";

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateClient = createServiceRoleClient as jest.Mock;

function makeClient() {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;
  const methods = ["from", "select", "eq", "maybeSingle", "upsert", "single"];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  chain.single.mockResolvedValue({ data: null, error: null });
  return { chain, supabase: { from: chain.from, schema: () => ({ from: () => chain }) } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockResolvedValue("user-1");
  mockIsSiteAdmin.mockResolvedValue(true);
});

describe("getSiteConfig", () => {
  it("returns null when key is not found", async () => {
    const { supabase } = makeClient();
    mockCreateClient.mockReturnValue(supabase);

    const result = await getSiteConfig("auto_import_enabled");

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("returns error for invalid key format", async () => {
    const result = await getSiteConfig("");

    expect(result.success).toBe(false);
  });

  it("returns error when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);

    const result = await getSiteConfig("auto_import_enabled");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("setSiteConfig", () => {
  it("updates config successfully", async () => {
    const { chain, supabase } = makeClient();
    chain.upsert.mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(supabase);

    const result = await setSiteConfig("auto_import_enabled", true);

    expect(result.success).toBe(true);
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("returns error for invalid key", async () => {
    const result = await setSiteConfig("invalid key!", true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid config key");
  });
});
