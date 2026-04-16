// Polyfill Web API globals missing from JSDOM — required by the workflow
// package and other modules that expect a full Web-standard environment.
import { TextEncoder, TextDecoder } from "util";

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  // Workflow SDK uses Request/Response/Headers at import time
  Request: globalThis.Request ?? class Request {},
  Response: globalThis.Response ?? class Response {},
  Headers: globalThis.Headers ?? class Headers {},
});

import "@testing-library/jest-dom";

jest.mock("workflow/api", () => ({
  start: jest.fn().mockResolvedValue({ runId: "mock-run-id" }),
  getRun: jest.fn(),
  resumeHook: jest.fn(),
}));

// Workflow modules import Discord REST which uses fetch — mock the workflow
// entry points so Jest doesn't follow their import chains into @discordjs/rest.
jest.mock("@/workflows/send-channel-notification", () => ({
  sendChannelNotificationWorkflow: jest.fn(),
}));
jest.mock("@/workflows/send-dm", () => ({
  sendDmWorkflow: jest.fn(),
}));
jest.mock("@/workflows/sync-role", () => ({
  syncRoleWorkflow: jest.fn(),
}));

// install-state uses jose (ESM-only) for JWT signing/verification.
// Mock it globally so test suites that transitively import it via
// actions/discord-integration don't fail on ESM parse. The actual
// install-state test overrides this mock with jest.mock("@/lib/discord/install-state")
// in its own file to use the real jose via transformIgnorePatterns.
jest.mock("@/lib/discord/install-state", () => ({
  signInstallState: jest.fn().mockResolvedValue("mock-signed-state"),
  verifyInstallState: jest
    .fn()
    .mockResolvedValue({ community_id: 1, user_id: "mock-user" }),
}));
