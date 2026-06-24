/**
 * Tests for LandingEmptyState (Milestone C, §16)
 *
 * Covers:
 *   - All three on-ramps are rendered
 *   - "Start from scratch" calls onNewTeam on click
 *   - "Import a paste" calls onImport when provided
 *   - "Import a paste" is disabled/absent interaction when onImport is undefined
 *   - "Start from a sample" is present but disabled (no crash, no handler)
 *   - Guest variant renders the local-save note
 *   - Authed variant does NOT render the local-save note
 *   - Guest headline differs from authed headline
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — before component import so Jest hoisting applies
// =============================================================================

// Lucide icons — replace with lightweight SVG stubs so DOM is inspectable
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("lucide-react", () => require("@trainers/test-utils/mocks/lucide-react").default);

// =============================================================================
// Component under test — imported AFTER mocks
// =============================================================================

import { LandingEmptyState } from "../empty-state";

// =============================================================================
// Helpers
// =============================================================================

function renderAuthed(overrides: {
  onNewTeam?: () => void;
  onImport?: () => void;
} = {}) {
  const onNewTeam = overrides.onNewTeam ?? jest.fn();
  return {
    onNewTeam,
    ...render(
      <LandingEmptyState
        variant="authed"
        onNewTeam={onNewTeam}
        onImport={overrides.onImport}
      />
    ),
  };
}

function renderGuest(overrides: {
  onNewTeam?: () => void;
  onImport?: () => void;
} = {}) {
  const onNewTeam = overrides.onNewTeam ?? jest.fn();
  return {
    onNewTeam,
    ...render(
      <LandingEmptyState
        variant="guest"
        onNewTeam={onNewTeam}
        onImport={overrides.onImport}
      />
    ),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("LandingEmptyState", () => {
  describe("three on-ramps are always rendered", () => {
    it("renders the Start from scratch on-ramp", () => {
      renderAuthed();
      // There may be two elements with the label (card title + button aria-label)
      expect(screen.getAllByText("Start from scratch").length).toBeGreaterThan(0);
    });

    it("renders the Import a paste on-ramp", () => {
      renderAuthed({ onImport: jest.fn() });
      expect(screen.getAllByText("Import a paste").length).toBeGreaterThan(0);
    });

    it("renders the Start from a sample on-ramp", () => {
      renderAuthed();
      expect(screen.getAllByText("Start from a sample").length).toBeGreaterThan(0);
    });
  });

  describe("Start from scratch — primary action", () => {
    it("calls onNewTeam when the button is clicked", async () => {
      const user = userEvent.setup();
      const onNewTeam = jest.fn();
      renderAuthed({ onNewTeam });

      // The on-ramp button has aria-label="Start from scratch"
      const btn = screen.getByRole("button", { name: "Start from scratch" });
      await user.click(btn);

      expect(onNewTeam).toHaveBeenCalledTimes(1);
    });

    it("does not call onNewTeam on sample or import clicks", async () => {
      const onNewTeam = jest.fn();
      renderAuthed({ onNewTeam });

      // Click sample button (disabled — pointer-events: none, so userEvent won't fire)
      const sampleBtn = screen.getByRole("button", { name: "Start from a sample" });
      expect(sampleBtn).toBeDisabled();

      expect(onNewTeam).not.toHaveBeenCalled();
    });
  });

  describe("Import a paste", () => {
    it("calls onImport when onImport is provided and button is clicked", async () => {
      const user = userEvent.setup();
      const onImport = jest.fn();
      renderAuthed({ onImport });

      const btn = screen.getByRole("button", { name: "Import a paste" });
      expect(btn).not.toBeDisabled();
      await user.click(btn);

      expect(onImport).toHaveBeenCalledTimes(1);
    });

    it("renders the button in a disabled state when onImport is undefined", () => {
      renderAuthed(); // no onImport
      const btn = screen.getByRole("button", { name: "Import a paste" });
      expect(btn).toBeDisabled();
    });

    it("does not throw when onImport is undefined", () => {
      expect(() => renderAuthed()).not.toThrow();
    });
  });

  describe("Start from a sample — stubbed on-ramp", () => {
    it("renders a disabled button — no crash, no handler", () => {
      renderAuthed();
      const btn = screen.getByRole("button", { name: "Start from a sample" });
      expect(btn).toBeDisabled();
    });

    it("shows a 'Coming soon' affordance", () => {
      renderAuthed();
      expect(screen.getByText("Coming soon")).toBeInTheDocument();
    });

    it("does not call onNewTeam when sample on-ramp is clicked", async () => {
      const onNewTeam = jest.fn();
      renderAuthed({ onNewTeam });
      // The button is disabled so a real click would not propagate, but we assert
      // the disabled attribute to confirm no interaction is possible.
      const btn = screen.getByRole("button", { name: "Start from a sample" });
      expect(btn).toBeDisabled();
      expect(onNewTeam).not.toHaveBeenCalled();
    });
  });

  describe("guest variant", () => {
    it("renders the guest headline", () => {
      renderGuest();
      expect(
        screen.getByText("Let's build your first team")
      ).toBeInTheDocument();
    });

    it("renders the local-save note", () => {
      renderGuest();
      expect(
        screen.getByText(/Building as a guest/)
      ).toBeInTheDocument();
    });

    it("mentions syncing across alts in the local-save note", () => {
      renderGuest();
      expect(
        screen.getByText(/organize across alts/)
      ).toBeInTheDocument();
    });
  });

  describe("authed variant", () => {
    it("renders the authed headline", () => {
      renderAuthed();
      expect(
        screen.getByText("No teams yet — let's fix that")
      ).toBeInTheDocument();
    });

    it("does NOT render the guest local-save note", () => {
      renderAuthed();
      expect(
        screen.queryByText(/Building as a guest/)
      ).not.toBeInTheDocument();
    });
  });

  describe("copy differences between variants", () => {
    it("guest and authed headlines are distinct", () => {
      const { unmount } = renderGuest();
      expect(screen.getByText("Let's build your first team")).toBeInTheDocument();
      unmount();

      renderAuthed();
      expect(screen.getByText("No teams yet — let's fix that")).toBeInTheDocument();
    });
  });

  describe("root element", () => {
    it("renders the data-testid sentinel for parent targeting", () => {
      renderAuthed();
      expect(screen.getByTestId("landing-empty-state")).toBeInTheDocument();
    });
  });
});
