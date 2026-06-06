import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusTabs, type StatusTab } from "../external-data-status-tabs";

const TABS: StatusTab[] = [
  { value: "all", label: "All", count: 100 },
  { value: "pending", label: "Pending", count: 60 },
  { value: "skipped", label: "Skipped", count: 40, tone: "skipped" },
];

describe("StatusTabs", () => {
  it("renders each tab with its label and count", () => {
    render(<StatusTabs tabs={TABS} active="all" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("marks the active tab as selected", () => {
    render(<StatusTabs tabs={TABS} active="pending" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("calls onChange with the tab value when clicked", async () => {
    const onChange = jest.fn();
    render(<StatusTabs tabs={TABS} active="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /Skipped/ }));
    expect(onChange).toHaveBeenCalledWith("skipped");
  });
});
