import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaitlistForm } from "../waitlist-form";
import { joinWaitlist } from "@/app/(auth-pages)/actions";

// Mock dependencies
jest.mock("@/app/(auth-pages)/actions", () => ({
  joinWaitlist: jest.fn(),
}));

const mockJoinWaitlist = joinWaitlist as jest.Mock;

describe("WaitlistForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders waitlist form correctly", () => {
    render(<WaitlistForm />);

    expect(screen.getByText("Join the Waitlist")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're currently in private beta. Sign up to be notified when we launch publicly."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join Waitlist" })
    ).toBeInTheDocument();
    expect(screen.getByText("Already have an account?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in"
    );
  });

  it("shows validation error for empty email", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "notanemail");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(
      () => {
        // Check for validation error message with role="alert"
        const errorMessage = screen.getByRole("alert");
        expect(errorMessage).toHaveTextContent(
          "Please enter a valid email address"
        );
      },
      { timeout: 3000 }
    );
  });

  it("accepts valid email format", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({ success: true });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockJoinWaitlist).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100)
        )
    );

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: "Joining..." })).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Joining..." })
      ).not.toBeInTheDocument();
    });
  });

  it("successfully joins waitlist and shows success message", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({ success: true });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Thanks for your interest in trainers.gg! We'll notify you as soon as we're ready to launch."
        )
      ).toBeInTheDocument();
    });

    // Form should be replaced with success message
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Join Waitlist" })
    ).not.toBeInTheDocument();

    // Success message should have link to sign in
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in"
    );
  });

  it("shows error message when joining waitlist fails", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({
      error: "Failed to join waitlist",
    });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to join waitlist")).toBeInTheDocument();
    });

    // Form should still be visible
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows specific error when email already exists", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({
      error: "This email is already on the waitlist",
    });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "existing@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("This email is already on the waitlist")
      ).toBeInTheDocument();
    });
  });

  it("shows generic error for unexpected errors", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockRejectedValue(new Error("Network error"));

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears previous error when form is resubmitted", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({
      error: "Failed to join waitlist",
    });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });

    // First submission with error
    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to join waitlist")).toBeInTheDocument();
    });

    // Second submission should clear error first
    mockJoinWaitlist.mockResolvedValue({ success: true });

    await user.clear(emailInput);
    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    // Error should be cleared before showing success
    await waitFor(() => {
      expect(
        screen.queryByText("Failed to join waitlist")
      ).not.toBeInTheDocument();
    });
  });

  it("has correct input attributes for accessibility", () => {
    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autoComplete", "email");
    expect(emailInput).toHaveAttribute("placeholder", "you@example.com");
  });

  it("prevents multiple submissions while loading", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 200)
        )
    );

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });

    // Click multiple times rapidly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only call joinWaitlist once
    await waitFor(() => {
      expect(mockJoinWaitlist).toHaveBeenCalledTimes(1);
    });
  });

  it("calls joinWaitlist with form value", async () => {
    const user = userEvent.setup();
    mockJoinWaitlist.mockResolvedValue({ success: true });

    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: "Join Waitlist" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockJoinWaitlist).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("uses FormField component from shadcn", () => {
    render(<WaitlistForm />);

    // The form uses shadcn's Form component, verify it renders correctly
    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput.closest("form")).toBeInTheDocument();
  });
});
