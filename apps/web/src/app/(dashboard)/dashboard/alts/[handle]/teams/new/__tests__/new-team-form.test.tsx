import { describe, it, expect } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
}));

const mockCreateTeamAction = jest.fn();
const mockAddPokemonToTeamAction = jest.fn();
jest.mock("@/actions/teams", () => ({
  createTeamAction: (...args: unknown[]) => mockCreateTeamAction(...args),
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
}));

jest.mock("@trainers/validators", () => ({
  parseShowdownText: jest.fn(() => []),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

import { NewTeamForm } from "../new-team-form";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Test data
// =============================================================================

const activeFormats: GameFormat[] = [
  { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
  { id: "gen9vgc2026regig", label: "SV: Reg IG", generation: 9 },
];

const defaultProps = {
  altId: 10,
  handle: "ash_ketchum",
  activeFormats,
  defaultFormat: "gen9vgc2026regi",
  initialMode: "empty" as const,
};

// =============================================================================
// Tests
// =============================================================================

describe("NewTeamForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the team name input", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(screen.getByLabelText("Team Name")).toBeInTheDocument();
    });

    it("renders format selector pills", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "SV: Reg I" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "SV: Reg IG" })
      ).toBeInTheDocument();
    });

    it("renders Empty team and Import paste mode buttons", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Empty team" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Import paste" })
      ).toBeInTheDocument();
    });

    it("renders Create Team submit button in empty mode", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Create Team" })
      ).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("does not render Showdown paste textarea in empty mode", () => {
      render(<NewTeamForm {...defaultProps} />);
      expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();
    });

    it("shows 'No active formats available' when formats list is empty", () => {
      render(<NewTeamForm {...defaultProps} activeFormats={[]} />);
      expect(
        screen.getByText("No active formats available.")
      ).toBeInTheDocument();
    });
  });

  describe("import mode", () => {
    it("shows paste textarea when import mode is selected", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Import paste" }));
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("renders as import mode from initialMode prop", () => {
      render(<NewTeamForm {...defaultProps} initialMode="import" />);
      expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
    });

    it("shows 'Import & Create Team' button label in import mode", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Import paste" }));
      expect(
        screen.getByRole("button", { name: "Import & Create Team" })
      ).toBeInTheDocument();
    });

    it("hides paste textarea when switching back to empty mode", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} initialMode="import" />);
      await user.click(screen.getByRole("button", { name: "Empty team" }));
      expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();
    });
  });

  describe("format selection", () => {
    it("selects a different format when pill is clicked", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      const regIGButton = screen.getByRole("button", { name: "SV: Reg IG" });
      await user.click(regIGButton);
      // The selected button gets primary background
      expect(regIGButton.className).toContain("bg-primary");
    });
  });

  describe("form validation", () => {
    it("shows toast error when team name is empty on submit", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter a team name.");
      });
    });

    it("does not call createTeamAction when name is empty", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      expect(mockCreateTeamAction).not.toHaveBeenCalled();
    });
  });

  describe("form submission", () => {
    it("calls createTeamAction with altId, name, and format", async () => {
      const user = userEvent.setup();
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Reg I Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(mockCreateTeamAction).toHaveBeenCalledWith(
          10,
          "My Reg I Team",
          "gen9vgc2026regi"
        );
      });
    });

    it("navigates to the new team workspace on success", async () => {
      const user = userEvent.setup();
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Reg I Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/dashboard/alts/ash_ketchum/teams/42"
        );
      });
    });

    it("shows error toast when createTeamAction fails", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockCreateTeamAction.mockResolvedValue({
        success: false,
        error: "Failed to create team",
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create team");
      });
    });

    it("shows toast success on successful creation", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockCreateTeamAction.mockResolvedValue({
        success: true,
        data: { id: 42 },
      });
      render(<NewTeamForm {...defaultProps} />);
      await user.type(screen.getByLabelText("Team Name"), "My Team");
      await user.click(screen.getByRole("button", { name: "Create Team" }));
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Team created!");
      });
    });
  });

  describe("Cancel button", () => {
    it("calls router.back() when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<NewTeamForm {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
