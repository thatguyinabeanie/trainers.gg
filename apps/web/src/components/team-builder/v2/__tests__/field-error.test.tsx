"use client";

/**
 * Behavioural tests for the FieldError component.
 *
 * FieldError is a small inline chip that renders a single error or warning
 * message beneath an offending field. Tests verify:
 *   - No render output when message is empty
 *   - Destructive colour for error severity (default)
 *   - Amber colour for warning severity
 *   - role="alert" and aria-live="polite" on the span
 *   - className prop merges into the element
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { FieldError } from "../validation/field-error";

// =============================================================================
// Tests
// =============================================================================

describe("FieldError — rendering", () => {
  it("renders the error message text", () => {
    render(<FieldError message="HP EVs exceed limit" />);
    expect(screen.getByText("HP EVs exceed limit")).toBeInTheDocument();
  });

  it("renders nothing meaningful when message is an empty string", () => {
    const { container } = render(<FieldError message="" />);
    // The span itself renders but has no visible text
    const span = container.querySelector("[role='alert']");
    expect(span).toBeInTheDocument();
    expect(span?.textContent).toBe("");
  });

  it("renders with role='alert'", () => {
    render(<FieldError message="Invalid move" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders with aria-live='polite'", () => {
    render(<FieldError message="Invalid move" />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });
});

describe("FieldError — severity colours", () => {
  it("applies text-destructive class for error severity (default)", () => {
    render(<FieldError message="Bad EV" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("text-destructive");
  });

  it("applies text-destructive class when severity is explicitly 'error'", () => {
    render(<FieldError message="Bad EV" severity="error" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("text-destructive");
  });

  it("applies text-amber-600 class for warning severity", () => {
    render(<FieldError message="Near EV limit" severity="warning" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("text-amber-600");
  });

  it("does NOT apply text-destructive for warning severity", () => {
    render(<FieldError message="Near EV limit" severity="warning" />);
    const el = screen.getByRole("alert");
    expect(el.className).not.toContain("text-destructive");
  });

  it("does NOT apply text-amber-600 for error severity", () => {
    render(<FieldError message="Bad EV" severity="error" />);
    const el = screen.getByRole("alert");
    expect(el.className).not.toContain("text-amber-600");
  });
});

describe("FieldError — className prop", () => {
  it("merges a custom className into the element", () => {
    render(<FieldError message="Err" className="mt-2" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("mt-2");
  });

  it("does not lose base classes when a custom className is provided", () => {
    render(<FieldError message="Err" className="mt-2" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("text-destructive");
    expect(el.className).toContain("mt-2");
  });
});

describe("FieldError — severity parameterised", () => {
  it.each([
    ["error", "text-destructive"],
    ["warning", "text-amber-600"],
  ] as const)(
    "severity='%s' → applies %s",
    (severity, expectedClass) => {
      render(<FieldError message="test" severity={severity} />);
      expect(screen.getByRole("alert").className).toContain(expectedClass);
    }
  );
});
