import { render, act } from "@testing-library/react";
import { PostHogProvider } from "@/lib/posthog/posthog-provider";

const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockStopSessionRecording = jest.fn();
const mockStartSessionRecording = jest.fn();
const mockRegister = jest.fn();
const mockUnregister = jest.fn();
const mockCapture = jest.fn();
const mockOptIn = jest.fn();
const mockOptOut = jest.fn();

let mockUser: {
  id: string;
  email: string;
  user_metadata: Record<string, string>;
} | null = null;
let mockIsAuthenticated = false;

jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    loading: false,
    signOut: jest.fn(),
    refetchUser: jest.fn(),
  }),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    __loaded: true,
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
  },
}));

jest.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  usePostHog: () => ({
    capture: mockCapture,
    identify: mockIdentify,
    reset: mockReset,
    stopSessionRecording: mockStopSessionRecording,
    startSessionRecording: mockStartSessionRecording,
    register: mockRegister,
    unregister: mockUnregister,
    opt_in_capturing: mockOptIn,
    opt_out_capturing: mockOptOut,
  }),
}));

jest.mock("@/lib/posthog/client", () => ({
  initPostHog: jest.fn(),
  posthog: {
    __loaded: true,
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
  },
}));

let mockConsentStatus = "undecided";

jest.mock("@/components/cookie-consent", () => ({
  getConsentStatus: () => mockConsentStatus,
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("PostHogProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockIsAuthenticated = false;
    mockConsentStatus = "undecided";
  });

  it("renders children", () => {
    const { getByText } = render(
      <PostHogProvider>
        <span>child content</span>
      </PostHogProvider>
    );

    expect(getByText("child content")).toBeTruthy();
  });

  it("identifies authenticated user", () => {
    mockUser = {
      id: "user-123",
      email: "ash@trainers.gg",
      user_metadata: { username: "ash_ketchum", full_name: "Ash Ketchum" },
    };
    mockIsAuthenticated = true;

    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    expect(mockIdentify).toHaveBeenCalledWith("user-123", {
      email: "ash@trainers.gg",
      username: "ash_ketchum",
      name: "Ash Ketchum",
      bluesky_handle: undefined,
    });
  });

  it("resets when not authenticated", () => {
    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    expect(mockReset).toHaveBeenCalled();
  });

  it("stops session recording during impersonation", () => {
    render(
      <PostHogProvider isImpersonating={true}>
        <span>test</span>
      </PostHogProvider>
    );

    expect(mockStopSessionRecording).toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalledWith({ $impersonated: true });
  });

  it("does not force-start session recording on initial mount", () => {
    render(
      <PostHogProvider isImpersonating={false}>
        <span>test</span>
      </PostHogProvider>
    );

    expect(mockUnregister).toHaveBeenCalledWith("$impersonated");
    // Should NOT call startSessionRecording on mount — consent controls this
    expect(mockStartSessionRecording).not.toHaveBeenCalled();
  });

  it("opts in on mount when returning user already granted consent", () => {
    mockConsentStatus = "granted";
    const { posthog } = jest.requireMock("@/lib/posthog/client") as {
      posthog: { opt_in_capturing: jest.Mock; opt_out_capturing: jest.Mock };
    };

    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    expect(posthog.opt_in_capturing).toHaveBeenCalled();
  });

  it("does not opt in on mount when consent is undecided", () => {
    const { posthog } = jest.requireMock("@/lib/posthog/client") as {
      posthog: { opt_in_capturing: jest.Mock; opt_out_capturing: jest.Mock };
    };

    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("catches and logs identify errors", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockIdentify.mockImplementationOnce(() => {
      throw new Error("identify failure");
    });
    mockUser = {
      id: "user-123",
      email: "ash@trainers.gg",
      user_metadata: { username: "ash_ketchum", full_name: "Ash Ketchum" },
    };
    mockIsAuthenticated = true;

    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "PostHog auth sync failed:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("handles consent-change event", () => {
    const { posthog } = jest.requireMock("@/lib/posthog/client") as {
      posthog: { opt_in_capturing: jest.Mock; opt_out_capturing: jest.Mock };
    };

    render(
      <PostHogProvider>
        <span>test</span>
      </PostHogProvider>
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("consent-change", { detail: "granted" })
      );
    });

    expect(posthog.opt_in_capturing).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("consent-change", { detail: "denied" })
      );
    });

    expect(posthog.opt_out_capturing).toHaveBeenCalled();
  });
});
