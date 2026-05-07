/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { DeliveryStatsCard } from "../delivery-stats-card";

describe("DeliveryStatsCard", () => {
  const stats = {
    channelMessages: 12,
    dmsDelivered: 5,
    roleSyncs: 3,
    failures: 2,
    period: "Last 24 hours",
  };

  it("renders the period in the header", () => {
    render(<DeliveryStatsCard stats={stats} />);
    expect(
      screen.getByText("Delivery Stats — Last 24 hours")
    ).toBeInTheDocument();
  });

  it("renders all stat values", () => {
    render(<DeliveryStatsCard stats={stats} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders all stat labels", () => {
    render(<DeliveryStatsCard stats={stats} />);
    expect(screen.getByText("Channel Messages")).toBeInTheDocument();
    expect(screen.getByText("DMs Delivered")).toBeInTheDocument();
    expect(screen.getByText("Role Syncs")).toBeInTheDocument();
    expect(screen.getByText("Failures")).toBeInTheDocument();
  });
});
