import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm, SignInView } from "../sign-in-form";

// --- Mocks ---

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignInWithEmail = jest.fn();
const mockSignUpWithEmail = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
  }),
}));

const mockResolveLoginIdentifier = jest.fn();
const mockCheckUsernameAvailability = jest.fn();
jest.mock("@/app/(auth-pages)/actions", () => ({
  resolveLoginIdentifier: (...args: unknown[]) =>
    mockResolveLoginIdentifier(...args),
  checkUsernameAvailability: (...args: unknown[]) =>
    mockCheckUsernameAvailability(...args),
}));

// next/link renders as <a> in jsdom
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// UsernameInput and PasswordInput forward refs to an <input>
jest.mock("@/components/ui/username-input", () => ({
  UsernameInput: ({
    id,
    ...rest
  }: { id?: string } & Record<string, unknown>) => (
    <input id={id} {...rest} />
  ),
}));

jest.mock("@/components/ui/password-input", () => ({
  PasswordInput: ({
    id,
    ...rest
  }: { id?: string } & Record<string, unknown>) => (
    <input id={id} type="password" {...rest} />
  ),
}));

import React from "react";

describe("SignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sign-in view by default", () => {
    render(<SignInForm />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("renders sign-up view when defaultMode=signup", () => {
    render(<SignInForm defaultMode="signup" />);
    expect(screen.getByText("Join trainers.gg")).toBeInTheDocument();
  });

  it("toggles to sign-up view when 'Create Account' is clicked", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByText("Join trainers.gg")).toBeInTheDocument();
  });

  it("toggles back to sign-in when 'Sign In' is clicked in sign-up view", async () => {
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });
});

describe("SignInView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading when hideHeading is false", () => {
    render(<SignInView />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("hides heading when hideHeading=true", () => {
    render(<SignInView hideHeading />);
    expect(screen.queryByText("Welcome Back")).not.toBeInTheDocument();
  });

  it("renders identifier and password fields", () => {
    render(<SignInView />);
    expect(screen.getByLabelText("Email or Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Forgot password link", () => {
    render(<SignInView />);
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toBeInTheDocument();
  });

  it("renders toggle button when onToggle is provided", () => {
    render(<SignInView onToggle={jest.fn()} />);
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("does not render toggle button when onToggle is omitted", () => {
    render(<SignInView />);
    expect(
      screen.queryByRole("button", { name: "Create Account" })
    ).not.toBeInTheDocument();
  });

  it("shows validation error when identifier is empty on submit", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(
        screen.getByText("Email or username is required")
      ).toBeInTheDocument();
    });
  });

  it("shows error alert when resolveLoginIdentifier returns an error", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({
      email: null,
      error: "No account found",
    });
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No account found");
    });
  });

  it("shows fallback error when resolveLoginIdentifier returns no email or error", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: null, error: null });
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not find account");
    });
  });

  it("shows error when signInWithEmail fails", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: "ash@example.com" });
    mockSignInWithEmail.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("redirects to '/' on successful sign in without redirectTo", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: "ash@example.com" });
    mockSignInWithEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("redirects to redirectTo path on successful sign in", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: "ash@example.com" });
    mockSignInWithEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignInView redirectTo="/tournaments/vgc-cup" />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tournaments/vgc-cup");
    });
  });

  it("redirects to '/' when redirectTo is not a relative path", async () => {
    mockResolveLoginIdentifier.mockResolvedValue({ email: "ash@example.com" });
    mockSignInWithEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignInView redirectTo="https://evil.com" />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows unexpected error when onSubmit throws", async () => {
    mockResolveLoginIdentifier.mockRejectedValue(new Error("Network failure"));
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
    });
  });

  it("shows 'Signing in...' while submitting", async () => {
    // Make the promise never resolve so we can observe the submitting state
    mockResolveLoginIdentifier.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(screen.getByLabelText("Email or Username"), "ash");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });
});

describe("SignUpView (via SignInForm defaultMode=signup)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all sign-up fields", () => {
    render(<SignInForm defaultMode="signup" />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("shows error when username is taken", async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: false });
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.type(screen.getByLabelText("Username"), "ash");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.type(screen.getByLabelText("Confirm Password"), "Pass123!");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Username is already taken"
      );
    });
  });

  it("shows checkUsernameAvailability error when returned", async () => {
    mockCheckUsernameAvailability.mockResolvedValue({
      available: false,
      error: "Service unavailable",
    });
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.type(screen.getByLabelText("Username"), "ash");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.type(screen.getByLabelText("Confirm Password"), "Pass123!");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
    });
  });

  it("shows sign-up error from signUpWithEmail", async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    mockSignUpWithEmail.mockResolvedValue({
      error: { message: "Email already registered" },
    });
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.type(screen.getByLabelText("Username"), "ash");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.type(screen.getByLabelText("Confirm Password"), "Pass123!");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email already registered"
      );
    });
  });

  it("redirects to '/' after successful sign-up", async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    mockSignUpWithEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.type(screen.getByLabelText("Username"), "ash");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.type(screen.getByLabelText("Confirm Password"), "Pass123!");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows 'Creating account...' during sign-up submission", async () => {
    mockCheckUsernameAvailability.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<SignInForm defaultMode="signup" />);

    await user.type(screen.getByLabelText("Username"), "ash");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "Pass123!");
    await user.type(screen.getByLabelText("Confirm Password"), "Pass123!");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    expect(
      screen.getByRole("button", { name: "Creating account..." })
    ).toBeDisabled();
  });
});
