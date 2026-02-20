import { captureException, initPostHog } from "@/lib/posthog/client";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    captureException: jest.fn(),
    __loaded: true,
  },
}));

import posthog from "posthog-js";

describe("captureException", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to posthog.captureException for Error instances", () => {
    const error = new Error("test error");

    captureException(error);

    expect(posthog.captureException).toHaveBeenCalledWith(error, undefined);
  });

  it("delegates to posthog.captureException for non-Error values", () => {
    captureException("string error");

    expect(posthog.captureException).toHaveBeenCalledWith(
      "string error",
      undefined
    );
  });

  it("passes additional properties through", () => {
    const error = new Error("test");
    const extra = { context: "signup" };

    captureException(error, extra);

    expect(posthog.captureException).toHaveBeenCalledWith(error, extra);
  });

  it("does nothing when posthog is not loaded", () => {
    (posthog as unknown as { __loaded: boolean }).__loaded = false;

    captureException(new Error("test"));

    expect(posthog.captureException).not.toHaveBeenCalled();

    (posthog as unknown as { __loaded: boolean }).__loaded = true;
  });

  it("catches and logs errors from posthog.captureException", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (posthog.captureException as jest.Mock).mockImplementationOnce(() => {
      throw new Error("posthog failure");
    });

    captureException(new Error("test"));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to capture exception in PostHog:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe("initPostHog", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (posthog as unknown as { __loaded: boolean }).__loaded = false;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("warns in development and skips init without env vars", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    process.env.NODE_ENV = "development";

    initPostHog();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing NEXT_PUBLIC_POSTHOG_KEY")
    );

    warnSpy.mockRestore();
  });

  it("initializes posthog with correct config", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phk_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    initPostHog();

    expect(posthog.init).toHaveBeenCalledWith(
      "phk_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        persistence: "localStorage+cookie",
        opt_out_capturing_by_default: true,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        disable_session_recording: false,
      })
    );
  });

  it("skips initialization when already loaded", () => {
    (posthog as unknown as { __loaded: boolean }).__loaded = true;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phk_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    initPostHog();

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("catches and logs init errors", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (posthog.init as jest.Mock).mockImplementationOnce(() => {
      throw new Error("init failure");
    });
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phk_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    initPostHog();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to initialize PostHog:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
