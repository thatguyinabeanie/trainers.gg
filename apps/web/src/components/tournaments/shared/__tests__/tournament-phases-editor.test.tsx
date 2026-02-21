/**
 * Tests for TournamentPhasesEditor component
 * Covers per-phase locking via lockedPhaseIds, add/remove, and phase updates
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PhaseConfig } from "@trainers/tournaments/types";
import {
  TournamentPhasesEditor,
  type TournamentPhasesEditorProps,
} from "../tournament-phases-editor";

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildPhase(overrides: Partial<PhaseConfig> = {}): PhaseConfig {
  return {
    id: `phase-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: "Swiss Rounds",
    phaseType: "swiss",
    bestOf: 3,
    roundTimeMinutes: 50,
    checkInTimeMinutes: 5,
    ...overrides,
  };
}

function renderEditor(
  overrides: Partial<TournamentPhasesEditorProps> = {},
  phases: PhaseConfig[] = []
) {
  const onPhasesChange = jest.fn();

  const props: TournamentPhasesEditorProps = {
    phases,
    onPhasesChange,
    mode: "edit",
    disabled: false,
    canAddRemove: true,
    ...overrides,
  };

  const result = render(<TournamentPhasesEditor {...props} />);
  return { ...result, onPhasesChange };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("TournamentPhasesEditor", () => {
  describe("empty state", () => {
    it("shows empty message when no phases exist", () => {
      renderEditor();

      expect(
        screen.getByText(
          "No phases configured yet. Add a phase to define your tournament structure."
        )
      ).toBeInTheDocument();
    });

    it("shows add button in empty state when canAddRemove is true", () => {
      renderEditor();

      expect(
        screen.getByRole("button", { name: /add phase/i })
      ).toBeInTheDocument();
    });

    it("hides add button in empty state when disabled", () => {
      renderEditor({ disabled: true });

      expect(
        screen.queryByRole("button", { name: /add phase/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("phase rendering", () => {
    it("renders phase name and number", () => {
      const phases = [buildPhase({ name: "Swiss Rounds" })];
      renderEditor({}, phases);

      expect(screen.getByDisplayValue("Swiss Rounds")).toBeInTheDocument();
      // Phase number badge is inside a .bg-primary span — "1" also appears in BestOf buttons,
      // so we query all and check the badge specifically
      const ones = screen.getAllByText("1");
      const badge = ones.find((el) => el.className.includes("bg-primary"));
      expect(badge).toBeDefined();
    });

    it("renders multiple phases with correct numbering", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds" }),
        buildPhase({
          id: "p2",
          name: "Top Cut",
          phaseType: "single_elimination",
        }),
      ];
      renderEditor({}, phases);

      expect(screen.getByDisplayValue("Swiss Rounds")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Top Cut")).toBeInTheDocument();

      // Phase number badges have bg-primary class, BestOf buttons do not
      const badges = screen
        .getAllByText(/^[12]$/)
        .filter((el) => el.className.includes("bg-primary"));
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("1");
      expect(badges[1]).toHaveTextContent("2");
    });
  });

  describe("add phase", () => {
    it("calls onPhasesChange with new swiss phase when no existing phases", async () => {
      const user = userEvent.setup();
      const { onPhasesChange } = renderEditor();

      await user.click(screen.getByRole("button", { name: /add phase/i }));

      expect(onPhasesChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "Swiss Rounds",
          phaseType: "swiss",
          bestOf: 3,
        }),
      ]);
    });

    it("defaults to single_elimination when swiss already exists", async () => {
      const user = userEvent.setup();
      const phases = [buildPhase({ phaseType: "swiss" })];
      const { onPhasesChange } = renderEditor({}, phases);

      await user.click(screen.getByRole("button", { name: /add phase/i }));

      expect(onPhasesChange).toHaveBeenCalledWith([
        phases[0],
        expect.objectContaining({
          name: "Top Cut",
          phaseType: "single_elimination",
          cutRule: "x-2",
        }),
      ]);
    });
  });

  describe("remove phase", () => {
    it("shows remove button when canAddRemove is true and multiple phases exist", () => {
      const phases = [
        buildPhase({ id: "p1" }),
        buildPhase({ id: "p2", phaseType: "single_elimination" }),
      ];
      renderEditor({}, phases);

      expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(
        2
      );
    });

    it("hides remove buttons when only one phase exists", () => {
      const phases = [buildPhase()];
      renderEditor({}, phases);

      expect(
        screen.queryByRole("button", { name: /remove/i })
      ).not.toBeInTheDocument();
    });

    it("calls onPhasesChange without the removed phase", async () => {
      const user = userEvent.setup();
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds" }),
        buildPhase({ id: "p2", name: "Top Cut" }),
      ];
      const { onPhasesChange } = renderEditor({}, phases);

      const removeButtons = screen.getAllByRole("button", {
        name: /remove/i,
      });
      await user.click(removeButtons[0]); // Remove first phase

      expect(onPhasesChange).toHaveBeenCalledWith([phases[1]]);
    });
  });

  describe("lockedPhaseIds — per-phase locking", () => {
    it("disables inputs for locked phases", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "active" }),
        buildPhase({ id: "p2", name: "Top Cut", status: "pending" }),
      ];
      const lockedPhaseIds = new Set(["p1"]);

      renderEditor({ lockedPhaseIds }, phases);

      // Locked phase: name input should be disabled
      const swissInput = screen.getByDisplayValue("Swiss Rounds");
      expect(swissInput).toBeDisabled();

      // Unlocked phase: name input should be enabled
      const topCutInput = screen.getByDisplayValue("Top Cut");
      expect(topCutInput).not.toBeDisabled();
    });

    it("shows lock icon for locked phases when not globally disabled", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "active" }),
      ];
      const lockedPhaseIds = new Set(["p1"]);

      renderEditor({ lockedPhaseIds, disabled: false }, phases);

      expect(
        screen.getByLabelText("Phase is locked because it has already started")
      ).toBeInTheDocument();
    });

    it("does not show lock icon when globally disabled", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "active" }),
      ];
      const lockedPhaseIds = new Set(["p1"]);

      // When globally disabled, isLocked is true via `disabled` prop, not lockedPhaseIds
      renderEditor({ lockedPhaseIds, disabled: true }, phases);

      expect(
        screen.queryByLabelText(
          "Phase is locked because it has already started"
        )
      ).not.toBeInTheDocument();
    });

    it("does not show lock icon for unlocked phases", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "pending" }),
      ];
      const lockedPhaseIds = new Set<string>();

      renderEditor({ lockedPhaseIds }, phases);

      expect(
        screen.queryByLabelText(
          "Phase is locked because it has already started"
        )
      ).not.toBeInTheDocument();
    });

    it("hides remove button for locked phases even when canAddRemove is true", () => {
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "active" }),
        buildPhase({ id: "p2", name: "Top Cut", status: "pending" }),
      ];
      const lockedPhaseIds = new Set(["p1"]);

      renderEditor({ lockedPhaseIds }, phases);

      // Only the unlocked phase should have a remove button
      const removeButtons = screen.getAllByRole("button", {
        name: /remove/i,
      });
      expect(removeButtons).toHaveLength(1);

      // Verify it's the Top Cut remove button (aria-label includes phase name)
      expect(removeButtons[0]).toHaveAttribute("aria-label", "Remove Top Cut");
    });

    it("allows editing unlocked phases when some phases are locked", async () => {
      const user = userEvent.setup();
      const phases = [
        buildPhase({ id: "p1", name: "Swiss Rounds", status: "active" }),
        buildPhase({ id: "p2", name: "Top Cut", status: "pending" }),
      ];
      const lockedPhaseIds = new Set(["p1"]);
      const { onPhasesChange } = renderEditor({ lockedPhaseIds }, phases);

      // Edit the unlocked phase name
      const topCutInput = screen.getByDisplayValue("Top Cut");
      await user.clear(topCutInput);
      await user.type(topCutInput, "Finals");

      expect(onPhasesChange).toHaveBeenCalled();
    });
  });

  describe("globally disabled", () => {
    it("disables all inputs when disabled prop is true", () => {
      const phases = [buildPhase({ id: "p1", name: "Swiss Rounds" })];
      renderEditor({ disabled: true }, phases);

      expect(screen.getByDisplayValue("Swiss Rounds")).toBeDisabled();
    });

    it("hides add button when disabled", () => {
      const phases = [buildPhase()];
      renderEditor({ disabled: true }, phases);

      expect(
        screen.queryByRole("button", { name: /add phase/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("swiss-specific features", () => {
    it("shows rounds input for swiss phases", () => {
      const phases = [buildPhase({ phaseType: "swiss" })];
      renderEditor({}, phases);

      expect(screen.getByPlaceholderText("Auto")).toBeInTheDocument();
    });

    it("does not show rounds input for elimination phases", () => {
      const phases = [
        buildPhase({ phaseType: "single_elimination", name: "Top Cut" }),
      ];
      renderEditor({}, phases);

      expect(screen.queryByPlaceholderText("Auto")).not.toBeInTheDocument();
    });
  });

  describe("cut rule", () => {
    it("shows cut rule selector for elimination phase preceded by swiss", () => {
      const phases = [
        buildPhase({ id: "p1", phaseType: "swiss" }),
        buildPhase({
          id: "p2",
          phaseType: "single_elimination",
          name: "Top Cut",
          cutRule: "x-2",
        }),
      ];
      renderEditor({}, phases);

      // The "Cut" label should be visible
      expect(screen.getByText("Cut")).toBeInTheDocument();
    });

    it("does not show cut rule for first elimination phase without preceding swiss", () => {
      const phases = [
        buildPhase({
          id: "p1",
          phaseType: "single_elimination",
          name: "Bracket",
        }),
      ];
      renderEditor({}, phases);

      expect(screen.queryByText("Cut")).not.toBeInTheDocument();
    });
  });

  describe("best of selector", () => {
    it("renders Bo1, Bo3, Bo5 buttons", () => {
      const phases = [buildPhase()];
      renderEditor({}, phases);

      // BestOfSelector renders buttons with text "1", "3", "5"
      const buttons = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.textContent === "1" ||
            b.textContent === "3" ||
            b.textContent === "5"
        );
      expect(buttons).toHaveLength(3);
    });

    it("calls onPhasesChange when best-of is changed", async () => {
      const user = userEvent.setup();
      const phases = [buildPhase({ id: "p1", bestOf: 3 })];
      const { onPhasesChange } = renderEditor({}, phases);

      // Click "1" button to change to Bo1
      const bo1Button = screen
        .getAllByRole("button")
        .find((b) => b.textContent === "1");
      await user.click(bo1Button!);

      expect(onPhasesChange).toHaveBeenCalledWith([
        expect.objectContaining({
          bestOf: 1,
          // Auto-updates round time from 50 (Bo3 default) to 25 (Bo1 default)
          roundTimeMinutes: 25,
        }),
      ]);
    });
  });
});
