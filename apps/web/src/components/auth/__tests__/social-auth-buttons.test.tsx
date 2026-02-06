import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialAuthButtons } from "../social-auth-buttons";
import { useAuth } from "@/hooks/use-auth";
import { oauthProviders } from "@/lib/supabase/auth";

// Mock dependencies
jest.mock("@/hooks/use-auth");
jest.mock("@/lib/supabase/auth", () => ({
  oauthProviders: [
    { name: "google", displayName: "Google", icon: "google", type: "supabase" },
    { name: "twitter", displayName: "X", icon: "twitter", type: "supabase" },
  ],
}));

const mockUseAuth = useAuth as jest.Mock;

describe("SocialAuthButtons", () => {
  let mockSignInWithOAuth: jest.Mock;
  const originalLocation = window.location;

  beforeEach(() => {
    mockSignInWithOAuth = jest.fn();
    mockUseAuth.mockReturnValue({
      signInWithOAuth: mockSignInWithOAuth,
    });

    // Mock window.location.href
    delete (window as any).location;
    window.location = { ...originalLocation, href: "" } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalLocation;
  });

  it("renders all auth provider buttons", () => {
    render(<SocialAuthButtons />);

    expect(
      screen.getByRole("button", { name: "Continue with Bluesky" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with X" })
    ).toBeInTheDocument();
  });

  it("renders email button when onEmailClick is provided", () => {
    const mockOnEmailClick = jest.fn();
    render(<SocialAuthButtons onEmailClick={mockOnEmailClick} />);

    expect(
      screen.getByRole("button", { name: "Continue with Email" })
    ).toBeInTheDocument();
  });

  it("does not render email button when onEmailClick is not provided", () => {
    render(<SocialAuthButtons />);

    expect(
      screen.queryByRole("button", { name: "Continue with Email" })
    ).not.toBeInTheDocument();
  });

  it("Bluesky button has primary styling", () => {
    render(<SocialAuthButtons />);

    const blueskyButton = screen.getByRole("button", {
      name: "Continue with Bluesky",
    });
    expect(blueskyButton).toHaveClass("bg-primary");
    expect(blueskyButton).toHaveClass("text-white");
  });

  it("OAuth provider buttons have outline styling", () => {
    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    const xButton = screen.getByRole("button", { name: "Continue with X" });

    // Both should have outline variant (actual class depends on Button component)
    expect(googleButton.className).toContain("outline");
    expect(xButton.className).toContain("outline");
  });

  it("calls signInWithOAuth when Google button is clicked", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue(undefined);

    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("google", undefined);
    });
  });

  it("calls signInWithOAuth when X button is clicked", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue(undefined);

    render(<SocialAuthButtons />);

    const xButton = screen.getByRole("button", { name: "Continue with X" });
    await user.click(xButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("twitter", undefined);
    });
  });

  it("passes redirectTo to OAuth provider", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue(undefined);

    render(<SocialAuthButtons redirectTo="/tournaments/my-tournament" />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        "google",
        "/tournaments/my-tournament"
      );
    });
  });

  it("redirects to Bluesky OAuth when Bluesky button is clicked", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons />);

    const blueskyButton = screen.getByRole("button", {
      name: "Continue with Bluesky",
    });
    await user.click(blueskyButton);

    await waitFor(() => {
      expect(window.location.href).toBe("/api/oauth/login");
    });
  });

  it("includes redirectTo in Bluesky OAuth URL when provided", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/tournaments/my-tournament" />);

    const blueskyButton = screen.getByRole("button", {
      name: "Continue with Bluesky",
    });
    await user.click(blueskyButton);

    await waitFor(() => {
      expect(window.location.href).toBe(
        "/api/oauth/login?returnUrl=%2Ftournaments%2Fmy-tournament"
      );
    });
  });

  it("calls onEmailClick when email button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnEmailClick = jest.fn();
    render(<SocialAuthButtons onEmailClick={mockOnEmailClick} />);

    const emailButton = screen.getByRole("button", {
      name: "Continue with Email",
    });
    await user.click(emailButton);

    expect(mockOnEmailClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner on clicked button", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleButton);

    // Button should show loading state
    const spinner = googleButton.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();

    await waitFor(() => {
      expect(
        googleButton.querySelector(".animate-spin")
      ).not.toBeInTheDocument();
    });
  });

  it("disables all buttons while one is loading", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SocialAuthButtons onEmailClick={jest.fn()} />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleButton);

    // All buttons should be disabled
    expect(
      screen.getByRole("button", { name: "Continue with Bluesky" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with X" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Email" })
    ).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Continue with Google" })
      ).not.toBeDisabled();
    });
  });

  it("shows loading spinner for Bluesky button", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons />);

    const blueskyButton = screen.getByRole("button", {
      name: "Continue with Bluesky",
    });
    await user.click(blueskyButton);

    // Should show spinner immediately (before redirect)
    const spinner = blueskyButton.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("prevents multiple clicks on same button", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });

    // Click multiple times rapidly
    await user.click(googleButton);
    await user.click(googleButton);
    await user.click(googleButton);

    // Should only call signInWithOAuth once
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });
  });

  it("prevents clicking different buttons while loading", async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    const xButton = screen.getByRole("button", { name: "Continue with X" });

    await user.click(googleButton);

    // Try to click X button while Google is loading
    await user.click(xButton);

    // Should only call signInWithOAuth for Google
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("google", undefined);
    });
  });

  it("renders provider icons correctly", () => {
    render(<SocialAuthButtons />);

    const blueskyButton = screen.getByRole("button", {
      name: "Continue with Bluesky",
    });
    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    const xButton = screen.getByRole("button", { name: "Continue with X" });

    // Check that icons are rendered (they should be SVG elements)
    expect(blueskyButton.querySelector("svg")).toBeInTheDocument();
    expect(googleButton.querySelector("svg")).toBeInTheDocument();
    expect(xButton.querySelector("svg")).toBeInTheDocument();
  });

  it("renders email icon when email button is shown", () => {
    const mockOnEmailClick = jest.fn();
    render(<SocialAuthButtons onEmailClick={mockOnEmailClick} />);

    const emailButton = screen.getByRole("button", {
      name: "Continue with Email",
    });
    expect(emailButton.querySelector("svg")).toBeInTheDocument();
  });

  it("maintains button order: Bluesky, Google, X, Email", () => {
    const mockOnEmailClick = jest.fn();
    render(<SocialAuthButtons onEmailClick={mockOnEmailClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Continue with Bluesky");
    expect(buttons[1]).toHaveTextContent("Continue with Google");
    expect(buttons[2]).toHaveTextContent("Continue with X");
    expect(buttons[3]).toHaveTextContent("Continue with Email");
  });

  it("handles OAuth errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Set up mock to reject with error
    mockSignInWithOAuth.mockImplementation(() =>
      Promise.reject(new Error("OAuth failed"))
    );

    render(<SocialAuthButtons />);

    const googleButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleButton);

    await waitFor(() => {
      // Button should re-enable after error
      expect(googleButton).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });
});
