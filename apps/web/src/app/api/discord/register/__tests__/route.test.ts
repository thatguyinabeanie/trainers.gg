/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before any imports (Jest hoisting requirement)
// =============================================================================

const mockRegisterGlobalCommands = jest.fn();
const mockRegisterGuildCommands = jest.fn();

jest.mock("@/lib/discord/api", () => ({
  registerGlobalCommands: (...args: unknown[]) =>
    mockRegisterGlobalCommands(...args),
  registerGuildCommands: (...args: unknown[]) =>
    mockRegisterGuildCommands(...args),
  // DiscordAPIError must be a real class so instanceof checks work
  DiscordAPIError: class DiscordAPIError extends Error {
    readonly status: number;
    readonly body: { code?: number; message?: string };
    constructor(
      status: number,
      body: { code?: number; message?: string },
      message?: string
    ) {
      super(
        message ??
          `Discord API error ${status}: ${body.message ?? "Unknown error"}`
      );
      this.name = "DiscordAPIError";
      this.status = status;
      this.body = body;
    }
  },
}));

// =============================================================================
// Imports — after mocks
// =============================================================================

import { ApplicationCommandType } from "discord-api-types/v10";

import { POST } from "../route";
import { commandRegistry } from "@/lib/discord/commands";
// Import after mock so we get the mock class
import { DiscordAPIError } from "@/lib/discord/api";

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(
  params: Record<string, string> = {},
  auth?: string
): Request {
  const url = new URL("http://localhost:3000/api/discord/register");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {};
  if (auth !== undefined) {
    headers["authorization"] = auth;
  }
  return new Request(url.toString(), { method: "POST", headers });
}

async function getJsonResponse(request: Request) {
  const response = await POST(request);
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();
  return { status: response.status, body };
}

// =============================================================================
// Tests
// =============================================================================

describe("POST /api/discord/register", () => {
  const CRON_SECRET = "test-cron-secret-abc123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe("authorization", () => {
    it("returns 401 when authorization header is missing", async () => {
      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(401);
      expect(body).toBe("Unauthorized");
    });

    it("returns 401 when bearer token does not match CRON_SECRET", async () => {
      const { status, body } = await getJsonResponse(
        makeRequest({}, "Bearer wrong-secret")
      );

      expect(status).toBe(401);
      expect(body).toBe("Unauthorized");
    });

    it("returns 401 when authorization uses wrong scheme", async () => {
      const { status, body } = await getJsonResponse(
        makeRequest({}, `Basic ${CRON_SECRET}`)
      );

      expect(status).toBe(401);
      expect(body).toBe("Unauthorized");
    });
  });

  // ---------------------------------------------------------------------------
  // Global registration
  // ---------------------------------------------------------------------------

  describe("global registration (no guild_id)", () => {
    it("calls registerGlobalCommands and returns scope=global", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      const { status, body } = await getJsonResponse(
        makeRequest({}, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(200);
      expect(body.scope).toBe("global");
      expect(body.guildId).toBeUndefined();
      expect(mockRegisterGlobalCommands).toHaveBeenCalledTimes(1);
      expect(mockRegisterGuildCommands).not.toHaveBeenCalled();
    });

    it("reports registered count equal to the number of commands in registry", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      const { status, body } = await getJsonResponse(
        makeRequest({}, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(200);
      expect(body.registered).toBe(commandRegistry.size);
    });

    it("passes definitions with correct shape to registerGlobalCommands", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      await POST(makeRequest({}, `Bearer ${CRON_SECRET}`));

      const [defs] = mockRegisterGlobalCommands.mock.calls[0] as [unknown[]];

      expect(Array.isArray(defs)).toBe(true);
      expect(defs.length).toBe(commandRegistry.size);

      // Every definition must have name, description, type=ChatInput
      for (const def of defs as {
        name: string;
        description: string;
        type: number;
        options?: unknown[];
        default_member_permissions?: string;
      }[]) {
        expect(typeof def.name).toBe("string");
        expect(typeof def.description).toBe("string");
        expect(def.description.length).toBeGreaterThan(0);
        expect(def.type).toBe(ApplicationCommandType.ChatInput);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Guild registration
  // ---------------------------------------------------------------------------

  describe("guild registration (guild_id provided)", () => {
    const GUILD_ID = "123456789012345678";

    it("calls registerGuildCommands with the guild ID and returns scope=guild", async () => {
      mockRegisterGuildCommands.mockResolvedValue(undefined);

      const { status, body } = await getJsonResponse(
        makeRequest({ guild_id: GUILD_ID }, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(200);
      expect(body.scope).toBe("guild");
      expect(body.guildId).toBe(GUILD_ID);
      expect(mockRegisterGuildCommands).toHaveBeenCalledTimes(1);
      expect(mockRegisterGuildCommands).toHaveBeenCalledWith(
        GUILD_ID,
        expect.any(Array)
      );
      expect(mockRegisterGlobalCommands).not.toHaveBeenCalled();
    });

    it("reports the registered count for guild scope", async () => {
      mockRegisterGuildCommands.mockResolvedValue(undefined);

      const { status, body } = await getJsonResponse(
        makeRequest({ guild_id: GUILD_ID }, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(200);
      expect(body.registered).toBe(commandRegistry.size);
    });
  });

  // ---------------------------------------------------------------------------
  // Command definition shape
  // ---------------------------------------------------------------------------

  describe("command definition shape", () => {
    it("includes options on commands that have them", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      await POST(makeRequest({}, `Bearer ${CRON_SECRET}`));

      const [defs] = mockRegisterGlobalCommands.mock.calls[0] as [
        {
          name: string;
          options?: unknown[];
          default_member_permissions?: string;
        }[],
      ];

      // /standings has a tournament option
      const standings = defs.find((d) => d.name === "standings");
      expect(standings?.options).toBeDefined();
      expect(Array.isArray(standings?.options)).toBe(true);
      expect(standings?.options?.length ?? 0).toBeGreaterThan(0);

      // /tournament has a name option
      const tournament = defs.find((d) => d.name === "tournament");
      expect(tournament?.options).toBeDefined();

      // /pairings has a tournament option
      const pairings = defs.find((d) => d.name === "pairings");
      expect(pairings?.options).toBeDefined();
    });

    it("omits options field on commands without options", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      await POST(makeRequest({}, `Bearer ${CRON_SECRET}`));

      const [defs] = mockRegisterGlobalCommands.mock.calls[0] as [
        { name: string; options?: unknown[] }[],
      ];

      // /events and /help have no options
      const events = defs.find((d) => d.name === "events");
      expect(events?.options).toBeUndefined();

      const help = defs.find((d) => d.name === "help");
      expect(help?.options).toBeUndefined();

      const channels = defs.find((d) => d.name === "channels");
      expect(channels?.options).toBeUndefined();
    });

    it("sets default_member_permissions on admin commands", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      await POST(makeRequest({}, `Bearer ${CRON_SECRET}`));

      const [defs] = mockRegisterGlobalCommands.mock.calls[0] as [
        {
          name: string;
          default_member_permissions?: string;
        }[],
      ];

      // Admin commands: setchannel, unsetchannel, channels
      for (const adminCmd of ["setchannel", "unsetchannel", "channels"]) {
        const def = defs.find((d) => d.name === adminCmd);
        expect(def?.default_member_permissions).toBe("16");
      }
    });

    it("does NOT set default_member_permissions on non-admin commands", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      await POST(makeRequest({}, `Bearer ${CRON_SECRET}`));

      const [defs] = mockRegisterGlobalCommands.mock.calls[0] as [
        {
          name: string;
          default_member_permissions?: string;
        }[],
      ];

      // Player-facing commands should not have permission restriction
      for (const cmd of [
        "tournament",
        "standings",
        "pairings",
        "events",
        "player",
        "team",
        "leaderboard",
        "drop",
        "link",
        "help",
      ]) {
        const def = defs.find((d) => d.name === cmd);
        expect(def?.default_member_permissions).toBeUndefined();
      }
    });

    it("registers exactly 13 commands", async () => {
      mockRegisterGlobalCommands.mockResolvedValue(undefined);

      const { body } = await getJsonResponse(
        makeRequest({}, `Bearer ${CRON_SECRET}`)
      );

      expect(body.registered).toBe(13);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe("Discord API error handling", () => {
    it("returns 502 with error body when Discord API rejects the registration", async () => {
      const discordErr = new DiscordAPIError(400, {
        code: 50035,
        message: "Invalid Form Body",
      });
      mockRegisterGlobalCommands.mockRejectedValue(discordErr);

      const { status, body } = await getJsonResponse(
        makeRequest({}, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(502);
      expect(body.error).toBe("Discord API rejected the registration");
      expect(body.code).toBe(50035);
      expect(body.status).toBe(400);
    });

    it("re-throws non-Discord errors (does not swallow unexpected failures)", async () => {
      const unexpected = new Error("Database connection failed");
      mockRegisterGlobalCommands.mockRejectedValue(unexpected);

      await expect(
        POST(makeRequest({}, `Bearer ${CRON_SECRET}`))
      ).rejects.toThrow("Database connection failed");
    });

    it("returns 502 for guild registration Discord API failures too", async () => {
      const discordErr = new DiscordAPIError(403, {
        code: 50013,
        message: "Missing Permissions",
      });
      mockRegisterGuildCommands.mockRejectedValue(discordErr);

      const { status, body } = await getJsonResponse(
        makeRequest({ guild_id: "guild-abc" }, `Bearer ${CRON_SECRET}`)
      );

      expect(status).toBe(502);
      expect(body.error).toBe("Discord API rejected the registration");
    });
  });
});
