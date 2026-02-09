/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

describe("isMaintenanceModeEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module registry so the env is re-read each time
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return true when NEXT_PUBLIC_MAINTENANCE_MODE is "true"', async () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = "true";
    const { isMaintenanceModeEnabled } = await import("../maintenance");
    expect(isMaintenanceModeEnabled()).toBe(true);
  });

  it('should return false when NEXT_PUBLIC_MAINTENANCE_MODE is "false"', async () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = "false";
    const { isMaintenanceModeEnabled } = await import("../maintenance");
    expect(isMaintenanceModeEnabled()).toBe(false);
  });

  it("should return false when NEXT_PUBLIC_MAINTENANCE_MODE is undefined", async () => {
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
    const { isMaintenanceModeEnabled } = await import("../maintenance");
    expect(isMaintenanceModeEnabled()).toBe(false);
  });
});
