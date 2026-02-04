// Mock Deno global before importing the module
// pds.ts reads Deno.env at module scope, so we need to set up the mock first
const mockEnv = new Map<string, string>([
  ["PDS_HOST", "https://pds.test.trainers.gg"],
  ["PDS_ADMIN_PASSWORD", "test-admin-password"],
  ["PDS_HANDLE_DOMAIN", "trainers.gg"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockEnv.get(key) ?? undefined,
  },
};

// Now we can import — the module will use our mocked Deno.env
import { generateSecurePassword, generateHandle, PDS_CONFIG } from "../pds";

describe("generateSecurePassword", () => {
  it("generates a password of the specified length", () => {
    const password = generateSecurePassword(32);
    expect(password).toHaveLength(32);
  });

  it("defaults to 32 characters", () => {
    const password = generateSecurePassword();
    expect(password).toHaveLength(32);
  });

  it("generates different passwords on each call", () => {
    const p1 = generateSecurePassword();
    const p2 = generateSecurePassword();
    expect(p1).not.toBe(p2);
  });

  it("generates a password with only valid characters", () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    const password = generateSecurePassword(100);
    for (const char of password) {
      expect(charset).toContain(char);
    }
  });

  it("handles custom lengths", () => {
    expect(generateSecurePassword(8)).toHaveLength(8);
    expect(generateSecurePassword(64)).toHaveLength(64);
  });
});

describe("generateHandle", () => {
  it("generates a handle in the format username.trainers.gg", () => {
    expect(generateHandle("ash_ketchum")).toBe("ash_ketchum.trainers.gg");
  });

  it("lowercases the username", () => {
    expect(generateHandle("Ash_Ketchum")).toBe("ash_ketchum.trainers.gg");
  });

  it("handles already lowercase input", () => {
    expect(generateHandle("player")).toBe("player.trainers.gg");
  });
});

describe("PDS_CONFIG", () => {
  it("exposes the configured host", () => {
    expect(PDS_CONFIG.host).toBe("https://pds.test.trainers.gg");
  });

  it("exposes the handle domain", () => {
    expect(PDS_CONFIG.handleDomain).toBe("trainers.gg");
  });

  it("reports whether admin password is set", () => {
    expect(PDS_CONFIG.hasAdminPassword).toBe(true);
  });
});
