import { TextEncoder, TextDecoder } from "util";
Object.assign(globalThis, { TextEncoder, TextDecoder });

import "@testing-library/jest-dom";

jest.mock("workflow/api", () => ({
  start: jest.fn().mockResolvedValue({ runId: "mock-run-id" }),
  getRun: jest.fn(),
  resumeHook: jest.fn(),
}));
