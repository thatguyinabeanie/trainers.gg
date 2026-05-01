import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { PickerShell } from "../pickers/picker-shell";

// =============================================================================
// PickerShell
// =============================================================================

describe("PickerShell", () => {
  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title in the header", () => {
    render(
      <PickerShell title="TEST" onClose={jest.fn()}>
        <div>body</div>
      </PickerShell>
    );
    expect(screen.getByText("TEST")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <PickerShell title="Ability" onClose={jest.fn()}>
        <div>picker body</div>
      </PickerShell>
    );
    expect(screen.getByText("picker body")).toBeInTheDocument();
  });

  it("renders the close button with aria-label 'Close'", () => {
    render(
      <PickerShell title="Ability" onClose={jest.fn()}>
        <div />
      </PickerShell>
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("clicking the close button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <PickerShell title="Ability" onClose={onClose}>
        <div />
      </PickerShell>
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Search input
  // ---------------------------------------------------------------------------

  it("renders a search input when the search prop is provided", () => {
    render(
      <PickerShell
        title="Item"
        onClose={jest.fn()}
        search={{ value: "", onChange: jest.fn(), placeholder: "Search…" }}
      >
        <div />
      </PickerShell>
    );
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("does NOT render a search input when the search prop is omitted", () => {
    render(
      <PickerShell title="Ability" onClose={jest.fn()}>
        <div />
      </PickerShell>
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("calls search.onChange with the new value when user types", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <PickerShell
        title="Item"
        onClose={jest.fn()}
        search={{ value: "", onChange, placeholder: "Search…" }}
      >
        <div />
      </PickerShell>
    );
    const input = screen.getByPlaceholderText("Search…");
    await user.type(input, "left");
    // onChange is called once per character typed
    expect(onChange).toHaveBeenCalledTimes(4);
    // The last call should have the last appended character
    expect(onChange).toHaveBeenLastCalledWith("t");
  });

  it("uses a default placeholder 'Search…' when placeholder is not provided", () => {
    render(
      <PickerShell
        title="Item"
        onClose={jest.fn()}
        search={{ value: "", onChange: jest.fn() }}
      >
        <div />
      </PickerShell>
    );
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Toolbar slot
  // ---------------------------------------------------------------------------

  it("renders toolbar content when toolbar prop is provided", () => {
    render(
      <PickerShell
        title="Nature"
        onClose={jest.fn()}
        toolbar={<div>filter chips</div>}
      >
        <div />
      </PickerShell>
    );
    expect(screen.getByText("filter chips")).toBeInTheDocument();
  });

  it("does NOT render toolbar when toolbar prop is omitted", () => {
    render(
      <PickerShell title="Nature" onClose={jest.fn()}>
        <div />
      </PickerShell>
    );
    expect(screen.queryByText("filter chips")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Width inline style
  // ---------------------------------------------------------------------------

  it("applies width inline style when width prop is provided as a string", () => {
    const { container } = render(
      <PickerShell title="Ability" onClose={jest.fn()} width="480px">
        <div />
      </PickerShell>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("480px");
  });

  it("applies width inline style when width prop is provided as a number", () => {
    const { container } = render(
      <PickerShell title="Ability" onClose={jest.fn()} width={320}>
        <div />
      </PickerShell>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("320px");
  });

  it("does not apply an inline width style when width is omitted", () => {
    const { container } = render(
      <PickerShell title="Ability" onClose={jest.fn()}>
        <div />
      </PickerShell>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("style")).toBeNull();
  });
});
