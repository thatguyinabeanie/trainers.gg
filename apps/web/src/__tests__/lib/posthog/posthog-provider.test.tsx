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
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
  },
}));

jest.mock("@/components/cookie-consent", () => ({
  getConsentStatus: () => "undecided",
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

  it("restarts session recording when impersonation ends", () => {
    render(
      <PostHogProvider isImpersonating={false}>
        <span>test</span>
      </PostHogProvider>
    );

    expect(mockUnregister).toHaveBeenCalledWith("$impersonated");
    expect(mockStartSessionRecording).toHaveBeenCalled();
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
