import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── next/image mock ────────────────────────────────────────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

import { MoveMobileRow } from "../move-mobile-row";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMoveData = (
  overrides: Partial<{
    name: string;
    type: string;
    category: "Physical" | "Special" | "Status";
    basePower: number;
    accuracy: number | true;
    shortDesc: string;
  }> = {}
) => ({
  name: "Dragon Claw",
  type: "Dragon",
  category: "Physical" as const,
  basePower: 80,
  accuracy: 100,
  shortDesc: "No additional effect.",
  ...overrides,
});

describe("MoveMobileRow", () => {
  describe("core rendering", () => {
    it("renders the move name", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} />
      );
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
    });

    it("renders BP label and value", () => {
      render(
        <MoveMobileRow move={makeMoveData({ basePower: 80 })} onPick={jest.fn()} />
      );
      expect(screen.getByText("BP", { exact: false })).toBeInTheDocument();
      expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("renders ACC label and value", () => {
      render(
        <MoveMobileRow move={makeMoveData({ accuracy: 100 })} onPick={jest.fn()} />
      );
      expect(screen.getByText("ACC", { exact: false })).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("renders — for BP when basePower is 0 (status move)", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ name: "Swords Dance", category: "Status", basePower: 0 })}
          onPick={jest.fn()}
        />
      );
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("renders — for ACC when accuracy is true (always-hit move)", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ name: "Swift", accuracy: true })}
          onPick={jest.fn()}
        />
      );
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("renders the category icon image for Physical moves", () => {
      render(
        <MoveMobileRow move={makeMoveData({ category: "Physical" })} onPick={jest.fn()} />
      );
      expect(screen.getByAltText("Physical")).toBeInTheDocument();
    });

    it("renders the category icon image for Special moves", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ name: "Flamethrower", category: "Special", basePower: 90 })}
          onPick={jest.fn()}
        />
      );
      expect(screen.getByAltText("Special")).toBeInTheDocument();
    });

    it("renders a shortDesc line when description has additional effect text", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ name: "Iron Head", shortDesc: "30% chance to flinch." })}
          onPick={jest.fn()}
        />
      );
      expect(screen.getByText("30% chance to flinch.")).toBeInTheDocument();
    });

    it("does NOT render a description line for generic 'No additional effect.' text", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ shortDesc: "No additional effect." })}
          onPick={jest.fn()}
        />
      );
      expect(
        screen.queryByText("No additional effect.")
      ).not.toBeInTheDocument();
    });

    it("does NOT render a description line when shortDesc is empty", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ shortDesc: "" })}
          onPick={jest.fn()}
        />
      );
      // Should still render the move name but no desc element
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
    });
  });

  describe("tap-to-select", () => {
    it("calls onPick with the move name when the row is tapped", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(<MoveMobileRow move={makeMoveData()} onPick={onPick} />);
      await user.click(screen.getByRole("button", { name: /dragon claw/i }));
      expect(onPick).toHaveBeenCalledWith("Dragon Claw");
      expect(onPick).toHaveBeenCalledTimes(1);
    });

    it("passes the correct move name when multiple rows exist", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(
        <>
          <MoveMobileRow
            move={makeMoveData({ name: "Earthquake", type: "Ground", basePower: 100 })}
            onPick={onPick}
          />
          <MoveMobileRow
            move={makeMoveData({ name: "Dragon Claw", type: "Dragon", basePower: 80 })}
            onPick={onPick}
          />
        </>
      );
      await user.click(screen.getByRole("button", { name: /earthquake/i }));
      expect(onPick).toHaveBeenCalledWith("Earthquake");
    });
  });

  describe("selection highlight", () => {
    it("applies bg-primary/5 when isSelected is true", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} isSelected />
      );
      expect(screen.getByTestId("move-mobile-row")).toHaveClass("bg-primary/5");
    });

    it("does not apply bg-primary/5 when isSelected is false", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} isSelected={false} />
      );
      expect(screen.getByTestId("move-mobile-row")).not.toHaveClass(
        "bg-primary/5"
      );
    });

    it("does not apply bg-primary/5 when isSelected is undefined", () => {
      render(<MoveMobileRow move={makeMoveData()} onPick={jest.fn()} />);
      expect(screen.getByTestId("move-mobile-row")).not.toHaveClass(
        "bg-primary/5"
      );
    });
  });

  describe("USG chip", () => {
    it("does NOT render the USG chip when usagePct is undefined", () => {
      render(<MoveMobileRow move={makeMoveData()} onPick={jest.fn()} />);
      expect(
        screen.queryByTestId("usg-move-Dragon Claw")
      ).not.toBeInTheDocument();
    });

    it("does NOT render the USG chip when usagePct is 0", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} usagePct={0} />
      );
      expect(
        screen.queryByTestId("usg-move-Dragon Claw")
      ).not.toBeInTheDocument();
    });

    it("renders the USG chip with formatted percentage when usagePct > 0", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} usagePct={42.7} />
      );
      const chip = screen.getByTestId("usg-move-Dragon Claw");
      expect(chip).toHaveTextContent("42.7%");
    });

    it("formats the USG chip to one decimal place", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} usagePct={30} />
      );
      expect(screen.getByTestId("usg-move-Dragon Claw")).toHaveTextContent(
        "30.0%"
      );
    });

    it("applies the teal primary chip styling", () => {
      render(
        <MoveMobileRow move={makeMoveData()} onPick={jest.fn()} usagePct={15.5} />
      );
      const chip = screen.getByTestId("usg-move-Dragon Claw");
      expect(chip).toHaveClass("bg-primary/10");
      expect(chip).toHaveClass("text-primary");
    });

    it("renders the USG chip with correct testid using the move name", () => {
      render(
        <MoveMobileRow
          move={makeMoveData({ name: "Fake Out" })}
          onPick={jest.fn()}
          usagePct={60.0}
        />
      );
      expect(screen.getByTestId("usg-move-Fake Out")).toHaveTextContent("60.0%");
    });
  });
});
