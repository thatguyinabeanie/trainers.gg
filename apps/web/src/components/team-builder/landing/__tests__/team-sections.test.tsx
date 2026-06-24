/**
 * Tests for TeamSections
 *
 * Covers:
 *   - Renders all sections with titles and counts
 *   - Rows rendered via stub renderRow
 *   - Collapsing a section hides its rows and removes them from roving order
 *   - emptyState shown when no drafts / no sections
 *   - Roving tabindex: first row starts at tabIndex=0, rest -1
 *   - ArrowDown / j moves active row forward
 *   - ArrowUp / k moves active row backward
 *   - Clamps at first and last row
 *   - Density class differs between comfortable/compact
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — before component import so Jest hoisting works
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("lucide-react", () => require("@trainers/test-utils/mocks/lucide-react").default);

// =============================================================================
// Imports
// =============================================================================

import { TeamSections, type RowInjectedProps } from "../team-sections";
import { type DraftSection } from "../group-drafts";
import { type LocalDraftRecord } from "../../persistence/local-drafts-types";
import { makeDraftRecord } from "./fixtures";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Minimal stub renderRow that renders a div with:
 * - data-testid="row-{record.id}"
 * - data-tabindex={tabIndex}
 * - the ref spread on (so keyboard nav can focus it)
 * - an accessible name matching the draft id for assertion
 */
function stubRenderRow(
  record: LocalDraftRecord,
  rowProps: RowInjectedProps
): React.ReactNode {
  return (
    <div
      key={record.id}
      data-testid={`row-${record.id}`}
      data-tabindex={rowProps.tabIndex}
      // tabIndex must be on the element for focus to work in JSDOM
      tabIndex={rowProps.tabIndex}
      ref={rowProps.ref}
      aria-label={`Draft ${record.id}`}
    >
      {record.team.name}
    </div>
  );
}

/** Build a minimal DraftSection. */
function makeSection(
  id: string,
  title: string,
  drafts: LocalDraftRecord[],
  kind: DraftSection["kind"] = "auto"
): DraftSection {
  return { id, title, kind, drafts };
}

// Fixture drafts
const draftA = makeDraftRecord({ id: "local-aa01", team: { name: "Alpha" } });
const draftB = makeDraftRecord({ id: "local-bb02", team: { name: "Bravo" } });
const draftC = makeDraftRecord({ id: "local-cc03", team: { name: "Charlie" } });
const draftD = makeDraftRecord({ id: "local-dd04", team: { name: "Delta" } });

// Two sections for multi-section tests
const sectionOne = makeSection("sec-1", "VGC 2026", [draftA, draftB]);
const sectionTwo = makeSection("sec-2", "VGC 2025", [draftC, draftD]);

// =============================================================================
// Tests
// =============================================================================

describe("TeamSections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Basic rendering
  // ---------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders each section title", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(screen.getByText("VGC 2026")).toBeInTheDocument();
      expect(screen.getByText("VGC 2025")).toBeInTheDocument();
    });

    it("renders the muted count for each section", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      // sectionOne has 2 drafts, sectionTwo has 2 drafts
      const counts = screen.getAllByLabelText(/drafts/i);
      expect(counts).toHaveLength(2);
      expect(counts[0]).toHaveTextContent("2");
      expect(counts[1]).toHaveTextContent("2");
    });

    it("renders all rows via renderRow stub", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(screen.getByTestId("row-local-aa01")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-bb02")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-cc03")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-dd04")).toBeInTheDocument();
    });

    it("renders the team name text from the draft record", () => {
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Bravo")).toBeInTheDocument();
    });

    it("renders a single-draft section with count 1", () => {
      const single = makeSection("sec-x", "Single", [draftA]);
      render(
        <TeamSections
          sections={[single]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(screen.getByLabelText("1 draft")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders emptyState when sections is empty", () => {
      render(
        <TeamSections
          sections={[]}
          density="comfortable"
          renderRow={stubRenderRow}
          emptyState={<p>No teams yet</p>}
        />
      );
      expect(screen.getByText("No teams yet")).toBeInTheDocument();
    });

    it("renders emptyState when all sections have 0 drafts", () => {
      const emptySec = makeSection("sec-e", "Empty", []);
      render(
        <TeamSections
          sections={[emptySec]}
          density="comfortable"
          renderRow={stubRenderRow}
          emptyState={<p>Nothing here</p>}
        />
      );
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("renders nothing (null) when sections is empty and emptyState is not provided", () => {
      const { container } = render(
        <TeamSections
          sections={[]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("does NOT render emptyState when there are drafts", () => {
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
          emptyState={<p>No teams yet</p>}
        />
      );
      expect(screen.queryByText("No teams yet")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Collapse behaviour
  // ---------------------------------------------------------------------------

  describe("collapse behaviour", () => {
    it("starts all sections expanded (rows visible)", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      expect(screen.getByTestId("row-local-aa01")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-cc03")).toBeInTheDocument();
    });

    it("hides a section's rows when its header is clicked (collapsed)", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // Click the section header button to collapse
      const headerButton = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(headerButton);

      // Rows should be gone
      expect(screen.queryByTestId("row-local-aa01")).not.toBeInTheDocument();
      expect(screen.queryByTestId("row-local-bb02")).not.toBeInTheDocument();
    });

    it("re-expands a section when header is clicked again", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const headerButton = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(headerButton); // collapse
      await user.click(headerButton); // expand

      expect(screen.getByTestId("row-local-aa01")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-bb02")).toBeInTheDocument();
    });

    it("collapses only the clicked section, not others", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // Collapse sectionOne only
      const btn1 = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(btn1);

      expect(screen.queryByTestId("row-local-aa01")).not.toBeInTheDocument();
      expect(screen.queryByTestId("row-local-bb02")).not.toBeInTheDocument();
      // sectionTwo rows still visible
      expect(screen.getByTestId("row-local-cc03")).toBeInTheDocument();
      expect(screen.getByTestId("row-local-dd04")).toBeInTheDocument();
    });

    it("header button has aria-expanded=true when expanded", () => {
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      const headerButton = screen.getByRole("button", { name: /VGC 2026/i });
      expect(headerButton).toHaveAttribute("aria-expanded", "true");
    });

    it("header button has aria-expanded=false when collapsed", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      const headerButton = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(headerButton);
      expect(headerButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Density classes
  // ---------------------------------------------------------------------------

  describe("density classes", () => {
    it("applies comfortable spacing class when density is comfortable", () => {
      const { container } = render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      // The row-container div carries data-density
      const rowContainer = container.querySelector("[data-density='comfortable']");
      expect(rowContainer).toBeInTheDocument();
      expect(rowContainer?.className).toContain("space-y-1");
    });

    it("applies compact spacing class when density is compact", () => {
      const { container } = render(
        <TeamSections
          sections={[sectionOne]}
          density="compact"
          renderRow={stubRenderRow}
        />
      );
      const rowContainer = container.querySelector("[data-density='compact']");
      expect(rowContainer).toBeInTheDocument();
      expect(rowContainer?.className).toContain("space-y-0");
    });

    it("comfortable and compact produce different class values", () => {
      const { container: c1 } = render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      const { container: c2 } = render(
        <TeamSections
          sections={[sectionOne]}
          density="compact"
          renderRow={stubRenderRow}
        />
      );
      const comfy = c1.querySelector("[data-density='comfortable']");
      const compact = c2.querySelector("[data-density='compact']");
      // The spacing classes must differ
      expect(comfy?.className).not.toEqual(compact?.className);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Roving tabindex — initial state
  // ---------------------------------------------------------------------------

  describe("roving tabindex — initial state", () => {
    it("gives the first row tabIndex=0", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      const firstRow = screen.getByTestId("row-local-aa01");
      expect(firstRow).toHaveAttribute("data-tabindex", "0");
    });

    it("gives all subsequent rows tabIndex=-1", () => {
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );
      for (const id of ["local-bb02", "local-cc03", "local-dd04"]) {
        expect(screen.getByTestId(`row-${id}`)).toHaveAttribute(
          "data-tabindex",
          "-1"
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Roving tabindex — keyboard navigation
  // ---------------------------------------------------------------------------

  describe("roving tabindex — keyboard navigation", () => {
    it("ArrowDown moves active to the second row", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // The list container has tabIndex={-1} so it can receive focus + keyboard events.
      const listEl = screen.getByRole("list");
      await user.click(listEl); // click to focus the list
      await user.keyboard("{ArrowDown}");

      // draftA (index 0) should now be -1, draftB (index 1) should be 0
      expect(screen.getByTestId("row-local-aa01")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
      expect(screen.getByTestId("row-local-bb02")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
    });

    it("j key moves active to the second row", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const listEl = screen.getByRole("list");
      await user.click(listEl);
      await user.keyboard("j");

      expect(screen.getByTestId("row-local-aa01")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
      expect(screen.getByTestId("row-local-bb02")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
    });

    it("ArrowUp from second row moves active back to first", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const listEl = screen.getByRole("list");
      await user.click(listEl);
      await user.keyboard("{ArrowDown}"); // move to index 1
      await user.keyboard("{ArrowUp}"); // move back to index 0

      expect(screen.getByTestId("row-local-aa01")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
      expect(screen.getByTestId("row-local-bb02")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
    });

    it("k key moves active up", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const listEl = screen.getByRole("list");
      await user.click(listEl);
      await user.keyboard("{ArrowDown}"); // to index 1
      await user.keyboard("k"); // back to index 0

      expect(screen.getByTestId("row-local-aa01")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
    });

    it("clamps at the last row when ArrowDown is pressed from the last row", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const listEl = screen.getByRole("list");
      await user.click(listEl);
      // sectionOne has 2 rows (index 0 and 1); press ArrowDown 5 times
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Last row (index 1) should be active
      expect(screen.getByTestId("row-local-bb02")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
    });

    it("clamps at the first row when ArrowUp is pressed from the first row", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      const listEl = screen.getByRole("list");
      await user.click(listEl);
      // Press ArrowUp several times from the initial first row
      await user.keyboard("{ArrowUp}");
      await user.keyboard("{ArrowUp}");
      await user.keyboard("{ArrowUp}");

      // First row should still be active
      expect(screen.getByTestId("row-local-aa01")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
    });

    it("navigates across section boundaries — ArrowDown from section 1's last row activates section 2's first row", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // Two sections → two role="list" elements; click the first one to focus
      // the keyboard-nav container (keyDown bubbles up to the outer div).
      const [listEl] = screen.getAllByRole("list");
      await user.click(listEl);
      // sectionOne: index 0 = draftA, index 1 = draftB
      // sectionTwo: index 2 = draftC, index 3 = draftD
      await user.keyboard("{ArrowDown}"); // to 1 (draftB)
      await user.keyboard("{ArrowDown}"); // to 2 (draftC)

      expect(screen.getByTestId("row-local-cc03")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
      expect(screen.getByTestId("row-local-bb02")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Roving tabindex — collapsed sections excluded from roving order
  // ---------------------------------------------------------------------------

  describe("roving tabindex — collapsed sections excluded", () => {
    it("collapses section 1 rows so section 2 rows are the only roving targets", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // Collapse sectionOne
      const btn1 = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(btn1);

      // Now only sectionTwo rows (draftC at 0, draftD at 1) are visible
      expect(screen.getByTestId("row-local-cc03")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
      expect(screen.getByTestId("row-local-dd04")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
    });

    it("ArrowDown after collapsing first section still works in second section", async () => {
      const user = userEvent.setup();
      render(
        <TeamSections
          sections={[sectionOne, sectionTwo]}
          density="comfortable"
          renderRow={stubRenderRow}
        />
      );

      // Collapse sectionOne
      const btn1 = screen.getByRole("button", { name: /VGC 2026/i });
      await user.click(btn1);

      // Now navigate within sectionTwo — click list to focus, then ArrowDown
      const listEl = screen.getByRole("list");
      await user.click(listEl);
      await user.keyboard("{ArrowDown}"); // to index 1 = draftD

      expect(screen.getByTestId("row-local-dd04")).toHaveAttribute(
        "data-tabindex",
        "0"
      );
      expect(screen.getByTestId("row-local-cc03")).toHaveAttribute(
        "data-tabindex",
        "-1"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 8. renderRow contract — injected props
  // ---------------------------------------------------------------------------

  describe("renderRow injected props", () => {
    it("passes tabIndex=0 to the first row and tabIndex=-1 to others", () => {
      const receivedProps: Array<{ id: string; tabIndex: number }> = [];

      function capturingRenderRow(
        record: LocalDraftRecord,
        rowProps: RowInjectedProps
      ) {
        receivedProps.push({ id: record.id, tabIndex: rowProps.tabIndex });
        return (
          <div
            key={record.id}
            data-testid={`row-${record.id}`}
            tabIndex={rowProps.tabIndex}
            ref={rowProps.ref}
          />
        );
      }

      render(
        <TeamSections
          sections={[sectionOne]}
          density="comfortable"
          renderRow={capturingRenderRow}
        />
      );

      expect(receivedProps[0]).toEqual({ id: "local-aa01", tabIndex: 0 });
      expect(receivedProps[1]).toEqual({ id: "local-bb02", tabIndex: -1 });
    });

    it("passes a ref callback that allows DOM focus to be requested", () => {
      // This test verifies the ref callback does not throw when called with
      // an element or null (cleanup).
      const receivedRefs: Array<((el: HTMLElement | null) => void) | undefined> = [];

      function refCapturingRow(
        record: LocalDraftRecord,
        rowProps: RowInjectedProps
      ) {
        receivedRefs.push(rowProps.ref);
        return (
          <div
            key={record.id}
            data-testid={`row-${record.id}`}
            tabIndex={rowProps.tabIndex}
            ref={rowProps.ref}
          />
        );
      }

      render(
        <TeamSections
          sections={[makeSection("s", "S", [draftA])]}
          density="comfortable"
          renderRow={refCapturingRow}
        />
      );

      // The ref should have been called with the DOM element
      expect(receivedRefs.length).toBeGreaterThan(0);
      const ref = receivedRefs[0];
      expect(ref).toBeDefined();
      // Calling with null should not throw (cleanup path)
      expect(() => ref?.(null)).not.toThrow();
    });
  });
});
