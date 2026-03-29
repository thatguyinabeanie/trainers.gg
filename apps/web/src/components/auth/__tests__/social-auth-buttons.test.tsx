import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialAuthButtons } from "../social-auth-buttons";

const mockSignInWithOAuth = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signInWithOAuth: mockSignInWithOAuth,
  }),
}));

jest.mock("@/lib/supabase/auth", () => ({
  oauthProviders: [
    { name: "x", displayName: "X", icon: "x", type: "supabase" },
    {
      name: "discord",
      displayName: "Discord",
      icon: "discord",
      type: "supabase",
    },
    {
      name: "twitch",
      displayName: "Twitch",
      icon: "twitch",
      type: "supabase",
    },
  ],
}));

// Mock window.location
delete (window as Partial<Window>).location;
window.location = { href: "" } as Location;

describe("SocialAuthButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = "";
  });

  it("renders all provider buttons", () => {
    render(<SocialAuthButtons />);

    expect(screen.getByText("Continue with Bluesky")).toBeInTheDocument();
    expect(screen.getByText("Continue with X")).toBeInTheDocument();
    expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
    expect(screen.getByText("Continue with Twitch")).toBeInTheDocument();
  });

  it("renders email button when onEmailClick is provided", () => {
    render(<SocialAuthButtons onEmailClick={jest.fn()} />);

    expect(screen.getByText("Continue with Email")).toBeInTheDocument();
  });

  it("does not render email button when onEmailClick is omitted", () => {
    render(<SocialAuthButtons />);

    expect(screen.queryByText("Continue with Email")).not.toBeInTheDocument();
  });

  it("calls signInWithOAuth with correct provider", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons />);

    await user.click(screen.getByText("Continue with Twitch"));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith("twitch", undefined);
  });

  it("passes redirectTo to signInWithOAuth", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/tournaments/vgc-cup" />);

    await user.click(screen.getByText("Continue with Discord"));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      "discord",
      "/tournaments/vgc-cup"
    );
  });

  it("redirects to Bluesky OAuth on click", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons />);

    await user.click(screen.getByText("Continue with Bluesky"));

    expect(window.location.href).toBe("/api/oauth/login");
  });

  it("includes returnUrl in Bluesky redirect when redirectTo is set", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/tournaments/vgc-cup" />);

    await user.click(screen.getByText("Continue with Bluesky"));

    expect(window.location.href).toBe(
      "/api/oauth/login?returnUrl=%2Ftournaments%2Fvgc-cup"
    );
  });
});
