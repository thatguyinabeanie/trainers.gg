// --- Mock modules before imports ---

const mockUpdateAltVisibilityAction = jest.fn();
jest.mock("@/actions/profile", () => ({
  updateAltVisibilityAction: (...args: unknown[]) =>
    mockUpdateAltVisibilityAction(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";

import { AltVisibilityToggle } from "../alt-visibility-toggle";

describe("AltVisibilityToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
  });

  it("renders with a 'Make private' label when public", () => {
    render(
      <AltVisibilityToggle altId={1} isPublic={true} onRefresh={jest.fn()} />
    );
    expect(screen.getByLabelText("Make private")).toBeInTheDocument();
  });

  it("renders with a 'Make public' label when private", () => {
    render(
      <AltVisibilityToggle altId={1} isPublic={false} onRefresh={jest.fn()} />
    );
    expect(screen.getByLabelText("Make public")).toBeInTheDocument();
  });

  it("calls updateAltVisibilityAction with the flipped value on click", async () => {
    render(
      <AltVisibilityToggle altId={42} isPublic={true} onRefresh={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(mockUpdateAltVisibilityAction).toHaveBeenCalledWith(42, false);
  });

  it("calls onRefresh on success", async () => {
    const onRefresh = jest.fn();
    render(
      <AltVisibilityToggle altId={1} isPublic={true} onRefresh={onRefresh} />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it("shows a toast when the action fails", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({
      success: false,
      error: "Nope",
    });
    render(
      <AltVisibilityToggle altId={1} isPublic={true} onRefresh={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(toast.error).toHaveBeenCalledWith("Nope");
  });

  it("stops click propagation so parent row handlers don't fire", () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <AltVisibilityToggle altId={1} isPublic={true} onRefresh={jest.fn()} />
      </div>
    );

    fireEvent.click(screen.getByLabelText("Make private"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it.each([
    ["Enter", "Enter"],
    ["Space", " "],
  ])("stops %s keydown propagation to parent", (_label, key) => {
    const parentKeyDown = jest.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <AltVisibilityToggle altId={1} isPublic={true} onRefresh={jest.fn()} />
      </div>
    );

    fireEvent.keyDown(screen.getByLabelText("Make private"), { key });
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("does not fire a second request while a visibility update is pending", () => {
    // Never-resolving promise keeps the transition pending for the test
    mockUpdateAltVisibilityAction.mockReturnValue(new Promise(() => {}));

    render(
      <AltVisibilityToggle altId={1} isPublic={true} onRefresh={jest.fn()} />
    );

    const button = screen.getByLabelText("Make private");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Initial click starts the request; subsequent clicks are ignored
    // because the button is disabled during the pending transition.
    expect(mockUpdateAltVisibilityAction).toHaveBeenCalledTimes(1);
  });
});
