/**
 * Tests for DiscordDmPreferencesSection component.
 * Verifies rendering, master toggle behavior, per-event checkbox interactions,
 * optimistic rollback on error, and the privacy warning banner.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { type DiscordDmEventType } from "@trainers/supabase";

import { DiscordDmPreferencesSection } from "../discord-dm-preferences-section";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSetDmPreferenceAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  setDmPreferenceAction: (...args: unknown[]) =>
    mockSetDmPreferenceAction(...args),
}));

// =============================================================================
// Test helpers
// =============================================================================

const ALL_EVENT_TYPES: DiscordDmEventType[] = [
  "match_ready",
  "match_starting_soon",
  "match_result_to_confirm",
  "match_disputed",
  "team_sheet_needed",
  "team_sheet_approved",
  "team_sheet_rejected",
  "you_dropped",
  "top_cut_made",
  "tournament_starting",
  "tournament_cancelled",
];

function buildPreferences(
  overrides: Partial<Record<DiscordDmEventType, boolean>> = {}
): Record<DiscordDmEventType, boolean> {
  const base = Object.fromEntries(
    ALL_EVENT_TYPES.map((t) => [t, false])
  ) as Record<DiscordDmEventType, boolean>;
  return { ...base, ...overrides };
}

const defaultProps = {
  discordHandle: "myuser#1234",
  initialPreferences: buildPreferences(),
  discordDmWarnUntil: null,
};

/**
 * Get a checkbox by its accessible name, excluding the hidden input
 * that Base UI renders alongside each checkbox role=checkbox span.
 */
function getCheckbox(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name });
}

function isChecked(el: HTMLElement): boolean {
  return el.getAttribute("aria-checked") === "true";
}

function isDisabled(el: HTMLElement): boolean {
  return (
    el.getAttribute("aria-disabled") === "true" ||
    el.hasAttribute("data-disabled")
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("DiscordDmPreferencesSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDmPreferenceAction.mockResolvedValue({
      success: true,
      data: undefined,
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe("rendering", () => {
    it("renders all 11 event checkboxes", () => {
      render(<DiscordDmPreferencesSection {...defaultProps} />);

      expect(getCheckbox("Match ready")).toBeInTheDocument();
      expect(getCheckbox("Match starting soon")).toBeInTheDocument();
      expect(getCheckbox("Match result to confirm")).toBeInTheDocument();
      expect(getCheckbox("Match disputed")).toBeInTheDocument();
      expect(getCheckbox("Team sheet needed")).toBeInTheDocument();
      expect(getCheckbox("Team sheet approved")).toBeInTheDocument();
      expect(getCheckbox("Team sheet rejected")).toBeInTheDocument();
      expect(getCheckbox("You dropped")).toBeInTheDocument();
      expect(getCheckbox("Top cut made")).toBeInTheDocument();
      expect(getCheckbox("Tournament starting")).toBeInTheDocument();
      expect(getCheckbox("Tournament cancelled")).toBeInTheDocument();
    });

    it("renders three section group headers", () => {
      render(<DiscordDmPreferencesSection {...defaultProps} />);

      expect(screen.getByText("Match events")).toBeInTheDocument();
      expect(screen.getByText("Team sheet events")).toBeInTheDocument();
      expect(screen.getByText("Tournament events")).toBeInTheDocument();
    });

    it("shows 'Connected as @handle' when discordHandle is provided", () => {
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          discordHandle="trainergabe"
        />
      );
      expect(screen.getByText("@trainergabe")).toBeInTheDocument();
    });

    it("shows Link Discord prompt when discordHandle is null", () => {
      render(
        <DiscordDmPreferencesSection {...defaultProps} discordHandle={null} />
      );
      expect(
        screen.getByRole("link", { name: "Link Discord" })
      ).toHaveAttribute("href", "/dashboard/settings/account");
    });
  });

  // ---------------------------------------------------------------------------
  // Master toggle
  // ---------------------------------------------------------------------------

  describe("master toggle", () => {
    it("master toggle starts ON when any preference is true", () => {
      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );
      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      // Switch is checked — aria-checked or data-checked
      expect(
        masterSwitch.getAttribute("aria-checked") === "true" ||
          masterSwitch.hasAttribute("data-checked")
      ).toBe(true);
    });

    it("master toggle starts OFF when all preferences are false", () => {
      render(<DiscordDmPreferencesSection {...defaultProps} />);
      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      expect(
        masterSwitch.getAttribute("aria-checked") === "false" ||
          masterSwitch.hasAttribute("data-unchecked")
      ).toBe(true);
    });

    it("checkboxes are enabled when master toggle is on", () => {
      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );
      const matchReadyCheckbox = getCheckbox("Match ready");
      expect(isDisabled(matchReadyCheckbox)).toBe(false);
    });

    it("checkboxes are disabled when master toggle is off", () => {
      // All prefs false → master is off → checkboxes disabled
      render(<DiscordDmPreferencesSection {...defaultProps} />);
      const matchReadyCheckbox = getCheckbox("Match ready");
      expect(isDisabled(matchReadyCheckbox)).toBe(true);
    });

    it("turning master toggle on enables checkboxes", async () => {
      const user = userEvent.setup();
      render(<DiscordDmPreferencesSection {...defaultProps} />);

      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      await user.click(masterSwitch);

      const matchReadyCheckbox = getCheckbox("Match ready");
      expect(isDisabled(matchReadyCheckbox)).toBe(false);
    });

    it("turning master toggle off disables checkboxes", async () => {
      const user = userEvent.setup();
      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      // Master is on since match_ready is true
      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      await user.click(masterSwitch);

      const matchReadyCheckbox = getCheckbox("Match ready");
      expect(isDisabled(matchReadyCheckbox)).toBe(true);
    });

    it("master toggle is disabled when Discord is not linked", () => {
      render(
        <DiscordDmPreferencesSection {...defaultProps} discordHandle={null} />
      );
      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      expect(isDisabled(masterSwitch)).toBe(true);
    });

    it("master toggle does NOT call setDmPreferenceAction", async () => {
      const user = userEvent.setup();
      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const masterSwitch = screen.getByRole("switch", {
        name: /enable discord dm/i,
      });
      await user.click(masterSwitch);

      expect(mockSetDmPreferenceAction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Checkbox interactions
  // ---------------------------------------------------------------------------

  describe("checkbox interactions", () => {
    it("calls setDmPreferenceAction with correct args when a checkbox is toggled on", async () => {
      const user = userEvent.setup();
      // Start with master ON (at least one pref true)
      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const tournamentCancelledCheckbox = getCheckbox("Tournament cancelled");
      await user.click(tournamentCancelledCheckbox);

      expect(mockSetDmPreferenceAction).toHaveBeenCalledWith({
        eventType: "tournament_cancelled",
        enabled: true,
      });
    });

    it("calls setDmPreferenceAction to disable when unchecking a checked box", async () => {
      const user = userEvent.setup();
      const prefs = buildPreferences({ match_ready: true, you_dropped: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const youDroppedCheckbox = getCheckbox("You dropped");
      await user.click(youDroppedCheckbox);

      expect(mockSetDmPreferenceAction).toHaveBeenCalledWith({
        eventType: "you_dropped",
        enabled: false,
      });
    });

    it("optimistically updates checkbox state before action resolves", async () => {
      const user = userEvent.setup();
      let resolveAction: (value: { success: boolean; data: undefined }) => void;
      mockSetDmPreferenceAction.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          })
      );

      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const teamSheetCheckbox = getCheckbox("Team sheet needed");
      await user.click(teamSheetCheckbox);

      // Checkbox should appear checked before action resolves
      expect(isChecked(teamSheetCheckbox)).toBe(true);

      // Clean up
      resolveAction!({ success: true, data: undefined });
    });
  });

  // ---------------------------------------------------------------------------
  // Error rollback
  // ---------------------------------------------------------------------------

  describe("error rollback", () => {
    it("rolls back checkbox state when action fails", async () => {
      const user = userEvent.setup();
      mockSetDmPreferenceAction.mockResolvedValue({
        success: false,
        error: "Server error",
      });

      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const teamSheetCheckbox = getCheckbox("Team sheet needed");
      // Initial state: unchecked
      expect(isChecked(teamSheetCheckbox)).toBe(false);

      await user.click(teamSheetCheckbox);

      await waitFor(() => {
        // Should roll back to unchecked after failure
        expect(isChecked(teamSheetCheckbox)).toBe(false);
      });
    });

    it("shows error toast when action fails", async () => {
      const user = userEvent.setup();
      mockSetDmPreferenceAction.mockResolvedValue({
        success: false,
        error: "Failed to save preference",
      });

      const prefs = buildPreferences({ match_ready: true });
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          initialPreferences={prefs}
        />
      );

      const teamSheetCheckbox = getCheckbox("Team sheet needed");
      await user.click(teamSheetCheckbox);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save preference");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Privacy warning banner
  // ---------------------------------------------------------------------------

  describe("privacy warning banner", () => {
    it("is hidden when discordDmWarnUntil is null", () => {
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          discordDmWarnUntil={null}
        />
      );
      expect(
        screen.queryByText(/your discord dms appear to be blocked/i)
      ).not.toBeInTheDocument();
    });

    it("is hidden when discordDmWarnUntil is in the past", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          discordDmWarnUntil={past}
        />
      );
      expect(
        screen.queryByText(/your discord dms appear to be blocked/i)
      ).not.toBeInTheDocument();
    });

    it("is shown when discordDmWarnUntil is in the future", () => {
      const future = new Date(Date.now() + 3_600_000).toISOString();
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          discordDmWarnUntil={future}
        />
      );
      expect(
        screen.getByText(/your discord dms appear to be blocked/i)
      ).toBeInTheDocument();
    });

    it("includes a 'Learn how' link pointing to Discord support", () => {
      const future = new Date(Date.now() + 3_600_000).toISOString();
      render(
        <DiscordDmPreferencesSection
          {...defaultProps}
          discordDmWarnUntil={future}
        />
      );
      const link = screen.getByRole("link", { name: /learn how/i });
      expect(link).toHaveAttribute(
        "href",
        "https://support.discord.com/hc/en-us/articles/217916488"
      );
    });
  });
});
