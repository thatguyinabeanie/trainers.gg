import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { DumbbellRow, DumbbellTrack } from "../usage-dumbbell";
import { type DumbbellDot } from "../usage-dumbbell";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

// next/link renders as a plain <a> in tests; mock the router so prefetching
// doesn't log warnings in the test output.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/",
}));

// =============================================================================
// Test data helpers
// =============================================================================

function makeDot(
  label: string,
  value: number,
  color = "oklch(0.66 0.12 180)"
): DumbbellDot {
  return { label, value, color };
}

// =============================================================================
// DumbbellRow — sprite and label rendering
// =============================================================================

describe("DumbbellRow — rendering", () => {
  it("renders the species name", () => {
    render(<DumbbellRow species="Koraidon" dots={[makeDot("rk9", 25)]} />);
    expect(screen.getByText("Koraidon")).toBeInTheDocument();
  });

  it("renders an img for the sprite", () => {
    render(<DumbbellRow species="Koraidon" dots={[makeDot("rk9", 25)]} />);
    const img = screen.getByRole("img", { name: "Koraidon" });
    expect(img).toHaveAttribute("src", "https://sprites.test/Koraidon.png");
  });

  it("renders an anchor when speciesHref is provided", () => {
    const href = (s: string) => `/data/species/${s}`;
    render(
      <DumbbellRow
        species="Koraidon"
        dots={[makeDot("rk9", 25)]}
        speciesHref={href}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/data/species/Koraidon");
  });

  it("renders a next/link (rendered as <a>) to the drill-down URL", () => {
    render(
      <DumbbellRow
        species="flutter-mane"
        dots={[makeDot("rk9", 28)]}
        speciesHref={(s) => `/data/pokemon/${s}?format=gen9vgc2025regg`}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/data/pokemon/flutter-mane?format=gen9vgc2025regg"
    );
  });

  it("does NOT render an anchor when speciesHref is absent", () => {
    render(<DumbbellRow species="Koraidon" dots={[makeDot("rk9", 25)]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

// =============================================================================
// DumbbellRow — N dots rendered
// =============================================================================

describe("DumbbellRow — dot count", () => {
  it("renders 1 dot button when given 1 dot", () => {
    render(<DumbbellRow species="Koraidon" dots={[makeDot("rk9", 25)]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });

  it("renders 3 dot buttons when given 3 dots", () => {
    const dots = [
      makeDot("rk9", 25),
      makeDot("limitless", 30),
      makeDot("trainers.gg", 20),
    ];
    render(<DumbbellRow species="Koraidon" dots={dots} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders 0 dot buttons when dots array is empty", () => {
    render(<DumbbellRow species="Koraidon" dots={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

// =============================================================================
// DumbbellTrack — dot positioning math (value / max → left %)
// =============================================================================

describe("DumbbellTrack — dot left% positioning", () => {
  /**
   * For a dot with value V and max M, the expected left% is (V / M) * 100.
   * We verify this via the inline style on the dot button.
   */

  it("positions a dot at 50% when value = max/2", () => {
    const dots = [makeDot("A", 50, "oklch(0.66 0.12 180)")];
    render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={100}
        lineLeft={50}
        lineRight={50}
        species="TestMon"
      />
    );
    const btn = screen.getByRole("button", { name: /50\.0%/ });
    expect(btn).toHaveStyle("left: 50%");
  });

  it("positions a dot at 25% when value is 25 and max is 100", () => {
    const dots = [makeDot("B", 25, "oklch(0.66 0.12 180)")];
    render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={100}
        lineLeft={25}
        lineRight={75}
        species="TestMon"
      />
    );
    const btn = screen.getByRole("button", { name: /25\.0%/ });
    expect(btn).toHaveStyle("left: 25%");
  });

  it("positions a dot at 0% when value is 0", () => {
    const dots = [makeDot("C", 0, "oklch(0.66 0.12 180)")];
    render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={100}
        lineLeft={0}
        lineRight={100}
        species="TestMon"
      />
    );
    const btn = screen.getByRole("button", { name: /0\.0%/ });
    expect(btn).toHaveStyle("left: 0%");
  });

  it("positions a dot at 100% when value equals max", () => {
    const dots = [makeDot("D", 40, "oklch(0.66 0.12 180)")];
    render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={40}
        lineLeft={0}
        lineRight={0}
        species="TestMon"
      />
    );
    const btn = screen.getByRole("button", { name: /40\.0%/ });
    expect(btn).toHaveStyle("left: 100%");
  });

  it("derives effective left% correctly for a fractional value", () => {
    // value=15, max=60 → left = 25%
    const dots = [makeDot("E", 15, "oklch(0.66 0.12 180)")];
    render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={60}
        lineLeft={25}
        lineRight={75}
        species="TestMon"
      />
    );
    const btn = screen.getByRole("button", { name: /15\.0%/ });
    expect(btn).toHaveStyle("left: 25%");
  });
});

// =============================================================================
// DumbbellTrack — connecting line spans min → max dot
// =============================================================================

describe("DumbbellTrack — connecting line span", () => {
  it("renders the connecting line when there are 2+ dots", () => {
    const dots = [makeDot("A", 20), makeDot("B", 60)];
    const { container } = render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={100}
        lineLeft={20}
        lineRight={40}
        species="TestMon"
      />
    );
    // The connecting line is the styled div with the `lineLeft` inline style.
    // We look for divs with a `left` inline style that isn't 0%.
    const divs = Array.from(container.querySelectorAll("div")).filter(
      (d) => d.style.left === "20%" && d.style.right === "40%"
    );
    expect(divs.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render a connecting line when there is only 1 dot", () => {
    const dots = [makeDot("A", 20)];
    const { container } = render(
      <DumbbellTrack
        dots={dots}
        effectiveMax={100}
        lineLeft={20}
        lineRight={80}
        species="TestMon"
      />
    );
    // The connecting line would have both left and right inline styles.
    const divsWithBoth = Array.from(container.querySelectorAll("div")).filter(
      (d) => d.style.left === "20%" && d.style.right === "80%"
    );
    expect(divsWithBoth.length).toBe(0);
  });
});

// =============================================================================
// DumbbellRow — effective max derivation
// =============================================================================

describe("DumbbellRow — effective max derivation", () => {
  it("uses the caller-supplied max for positioning", () => {
    // dot value 10, max 50 → left 20%
    const dots = [makeDot("rk9", 10)];
    render(<DumbbellRow species="TestMon" dots={dots} max={50} />);
    const btn = screen.getByRole("button", { name: /10\.0%/ });
    expect(btn).toHaveStyle("left: 20%");
  });

  it("derives max from dots when no max prop is given", () => {
    // Two dots: 10 and 40; max = 40; dot at 10 → left 25%
    const dots = [makeDot("A", 10), makeDot("B", 40)];
    render(<DumbbellRow species="TestMon" dots={dots} />);
    const btn10 = screen.getByRole("button", { name: /10\.0%/ });
    expect(btn10).toHaveStyle("left: 25%");
    const btn40 = screen.getByRole("button", { name: /40\.0%/ });
    expect(btn40).toHaveStyle("left: 100%");
  });
});

// =============================================================================
// DumbbellRow — onDotHover callback
// =============================================================================

describe("DumbbellRow — onDotHover", () => {
  it("calls onDotHover with the dot when a dot button receives pointerenter", () => {
    const onDotHover = jest.fn();
    const dots = [makeDot("rk9", 25)];
    render(
      <DumbbellRow species="Koraidon" dots={dots} onDotHover={onDotHover} />
    );
    const btn = screen.getByRole("button", { name: /25\.0%/ });
    // JSDOM does not implement getBoundingClientRect fully, but the event fires.
    fireEvent.pointerEnter(btn);
    expect(onDotHover).toHaveBeenCalledTimes(1);
    const [dot, , species] = onDotHover.mock.calls[0]!;
    expect(dot).toMatchObject({ label: "rk9", value: 25 });
    expect(species).toBe("Koraidon");
  });

  it("calls onDotHover(null, null, species) when pointerleave fires on a dot", () => {
    const onDotHover = jest.fn();
    const dots = [makeDot("rk9", 25)];
    render(
      <DumbbellRow species="Koraidon" dots={dots} onDotHover={onDotHover} />
    );
    const btn = screen.getByRole("button", { name: /25\.0%/ });
    fireEvent.pointerEnter(btn);
    fireEvent.pointerLeave(btn);
    const lastCall = onDotHover.mock.calls[onDotHover.mock.calls.length - 1];
    expect(lastCall).toEqual([null, null, "Koraidon"]);
  });
});

// =============================================================================
// Forbidden phrases
// =============================================================================

describe("DumbbellRow — forbidden phrases", () => {
  it("never contains the phrase 'top cut'", () => {
    const dots = [makeDot("rk9", 25), makeDot("limitless", 30)];
    const { container } = render(
      <DumbbellRow species="Koraidon" dots={dots} />
    );
    expect((container.textContent ?? "").toLowerCase()).not.toContain(
      "top cut"
    );
  });
});
