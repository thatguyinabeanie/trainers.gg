// --- Mock modules before imports ---

// --- @/actions/alts ---
const mockCreateAltAction = jest.fn();
jest.mock("@/actions/alts", () => ({
  createAltAction: (...args: unknown[]) => mockCreateAltAction(...args),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="icon-plus" />,
  X: () => <svg data-testid="icon-x" />,
  Loader2: () => <svg data-testid="icon-loader" />,
  Check: () => <svg data-testid="icon-check" />,
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// --- @/components/ui/card ---
jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// --- @/components/ui/input ---
jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

// --- @/components/ui/label ---
jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <label {...props}>{children}</label>,
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";

import { CreateAltForm } from "../create-alt-form";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultProps(): React.ComponentProps<typeof CreateAltForm> {
  return {
    onCreated: jest.fn(),
    onCancel: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreateAltForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  it("renders heading and description", () => {
    render(<CreateAltForm {...getDefaultProps()} />);
    expect(screen.getByText("Create New Alt")).toBeInTheDocument();
    expect(screen.getByText("Add a new player identity")).toBeInTheDocument();
  });

  it("renders username input with label", () => {
    render(<CreateAltForm {...getDefaultProps()} />);
    expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
  });

  it("renders Create Alt and Cancel buttons", () => {
    render(<CreateAltForm {...getDefaultProps()} />);
    expect(
      screen.getByRole("button", { name: /Create Alt/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });

  // ── Validation ──────────────────────────────────────────────────────────

  it("shows error toast when submitting with empty username", () => {
    render(<CreateAltForm {...getDefaultProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /Create Alt/ }));
    expect(toast.error).toHaveBeenCalledWith("Username is required");
    expect(mockCreateAltAction).not.toHaveBeenCalled();
  });

  it("shows error toast when submitting with whitespace-only username", () => {
    render(<CreateAltForm {...getDefaultProps()} />);
    const input = screen.getByLabelText(/Username/);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Create Alt/ }));
    expect(toast.error).toHaveBeenCalledWith("Username is required");
  });

  // ── Successful creation ─────────────────────────────────────────────────

  it("calls createAltAction with trimmed lowercase username on success", async () => {
    mockCreateAltAction.mockResolvedValue({ success: true, data: { id: 42 } });
    const props = getDefaultProps();
    render(<CreateAltForm {...props} />);

    const input = screen.getByLabelText(/Username/);
    fireEvent.change(input, { target: { value: "  Ash_Alt  " } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Create Alt/ }));
    });

    expect(mockCreateAltAction).toHaveBeenCalledWith({
      username: "ash_alt",
    });
    expect(toast.success).toHaveBeenCalledWith("Alt created successfully!");
    expect(props.onCreated).toHaveBeenCalled();
  });

  // ── Failed creation ─────────────────────────────────────────────────────

  it("shows error toast when createAltAction fails", async () => {
    mockCreateAltAction.mockResolvedValue({
      success: false,
      error: "Username already taken",
    });
    const props = getDefaultProps();
    render(<CreateAltForm {...props} />);

    const input = screen.getByLabelText(/Username/);
    fireEvent.change(input, { target: { value: "taken_name" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Create Alt/ }));
    });

    expect(toast.error).toHaveBeenCalledWith("Username already taken");
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  // ── Cancel ──────────────────────────────────────────────────────────────

  it("calls onCancel when Cancel button is clicked", () => {
    const props = getDefaultProps();
    render(<CreateAltForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(props.onCancel).toHaveBeenCalled();
  });

  // ── Keyboard interaction ────────────────────────────────────────────────

  it("submits on Enter keypress in input", async () => {
    mockCreateAltAction.mockResolvedValue({ success: true, data: { id: 1 } });
    const props = getDefaultProps();
    render(<CreateAltForm {...props} />);

    const input = screen.getByLabelText(/Username/);
    fireEvent.change(input, { target: { value: "keyboard_alt" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(mockCreateAltAction).toHaveBeenCalledWith({
      username: "keyboard_alt",
    });
  });

  it("calls onCancel on Escape keypress in input", () => {
    const props = getDefaultProps();
    render(<CreateAltForm {...props} />);

    const input = screen.getByLabelText(/Username/);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(props.onCancel).toHaveBeenCalled();
  });
});
