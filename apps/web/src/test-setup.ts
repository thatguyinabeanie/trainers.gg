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

// jose is ESM-only and fails to parse in Jest's CJS environment.
// Mock it globally since it's only used server-side (install-state signing).
jest.mock("jose", () => ({
  SignJWT: jest.fn().mockReturnValue({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-jwt-token"),
  }),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: { community_id: 1, user_id: "mock-user" },
  }),
}));
