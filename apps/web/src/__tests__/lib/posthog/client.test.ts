import { captureException } from "@/lib/posthog/client";

// Mock posthog-js
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    __loaded: true,
  },
}));

import posthog from "posthog-js";

describe("captureException", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures Error instances with stack trace", () => {
    const error = new Error("test error");
    error.name = "TypeError";

    captureException(error);

    expect(posthog.capture).toHaveBeenCalledWith("$exception", {
      $exception_message: "test error",
      $exception_type: "TypeError",
      $exception_stack_trace_raw: error.stack,
    });
  });

  it("captures non-Error values as strings", () => {
    captureException("string error");

    expect(posthog.capture).toHaveBeenCalledWith("$exception", {
      $exception_message: "string error",
    });
  });

  it("does nothing when posthog is not loaded", () => {
    (posthog as unknown as { __loaded: boolean }).__loaded = false;

    captureException(new Error("test"));

    expect(posthog.capture).not.toHaveBeenCalled();

    (posthog as unknown as { __loaded: boolean }).__loaded = true;
  });
});
