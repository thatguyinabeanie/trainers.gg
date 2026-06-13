import React from "react";
import { render, screen } from "@testing-library/react";

import {
  SampleBadge,
  LOW_SAMPLE_THRESHOLD,
  VERY_LOW_SAMPLE_THRESHOLD,
} from "../sample-badge";

// =============================================================================
// SampleBadge
// =============================================================================

describe("SampleBadge — threshold behavior", () => {
  it("renders nothing when n >= LOW_SAMPLE_THRESHOLD", () => {
    const { container } = render(<SampleBadge n={LOW_SAMPLE_THRESHOLD} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when n is well above the threshold", () => {
    const { container } = render(<SampleBadge n={5000} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a 'Low sample' badge when n is between VERY_LOW and LOW", () => {
    const n = VERY_LOW_SAMPLE_THRESHOLD; // exactly at very-low boundary
    render(<SampleBadge n={n} />);
    expect(screen.getByText(`Low sample (n=${n.toLocaleString()})`)).toBeInTheDocument();
  });

  it("renders a 'Very low' badge when n < VERY_LOW_SAMPLE_THRESHOLD", () => {
    const n = VERY_LOW_SAMPLE_THRESHOLD - 1;
    render(<SampleBadge n={n} />);
    expect(screen.getByText(`Very low sample (n=${n.toLocaleString()})`)).toBeInTheDocument();
  });

  it("renders a 'Low sample' badge at n = LOW_SAMPLE_THRESHOLD - 1", () => {
    const n = LOW_SAMPLE_THRESHOLD - 1;
    render(<SampleBadge n={n} />);
    expect(screen.getByText(`Low sample (n=${n.toLocaleString()})`)).toBeInTheDocument();
  });

  it("renders nothing at exactly n = 0 threshold boundary (very low)", () => {
    // n=0 < VERY_LOW_SAMPLE_THRESHOLD → renders "Very low sample"
    render(<SampleBadge n={0} />);
    expect(screen.getByText("Very low sample (n=0)")).toBeInTheDocument();
  });

  it.each([
    [5, "Very low"],
    [29, "Very low"],
    [30, "Low"],
    [99, "Low"],
  ])("renders correct label for n=%i", (n, expectedLabel) => {
    render(<SampleBadge n={n} />);
    expect(screen.getByText(new RegExp(expectedLabel, "i"))).toBeInTheDocument();
  });
});

describe("SampleBadge — accessibility", () => {
  it("includes a descriptive title on the Low badge", () => {
    const n = 50;
    render(<SampleBadge n={n} />);
    const badge = screen.getByTitle(/low sample.*50 players/i);
    expect(badge).toBeInTheDocument();
  });

  it("includes a descriptive title on the Very low badge", () => {
    const n = 10;
    render(<SampleBadge n={n} />);
    const badge = screen.getByTitle(/very low sample.*10 players/i);
    expect(badge).toBeInTheDocument();
  });
});

describe("SampleBadge — className passthrough", () => {
  it("applies the supplied className to the rendered span", () => {
    const n = 50;
    const { container } = render(<SampleBadge n={n} className="my-test-class" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("my-test-class");
  });
});
