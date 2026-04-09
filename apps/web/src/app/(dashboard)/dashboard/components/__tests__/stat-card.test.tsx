import { render, screen } from "@testing-library/react";
import React from "react";

import { StatCard } from "../stat-card";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Win Rate" value="62.5%" />);
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("62.5%")).toBeInTheDocument();
  });

  it("renders sub text when provided", () => {
    render(<StatCard label="Rating" value="1500" sub="Top 10%" />);
    expect(screen.getByText("Top 10%")).toBeInTheDocument();
  });

  it("does not render sub text when omitted", () => {
    const { container } = render(<StatCard label="Record" value="5-3" />);
    // There should be exactly 2 <p> elements: label + value
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
  });

  it("applies subClassName to sub text element", () => {
    render(
      <StatCard
        label="Tournaments"
        value="3"
        sub="1 upcoming"
        subClassName="text-emerald-600"
      />
    );
    const subEl = screen.getByText("1 upcoming");
    expect(subEl).toHaveClass("text-emerald-600");
  });

  it("does not apply subClassName when sub is not provided", () => {
    const { container } = render(
      <StatCard label="Events" value="0" subClassName="text-emerald-600" />
    );
    // No sub text paragraph should exist (only label + value = 2 <p>s)
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
  });
});
