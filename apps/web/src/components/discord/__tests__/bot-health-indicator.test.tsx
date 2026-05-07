/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { BotHealthIndicator } from "../bot-health-indicator";

describe("BotHealthIndicator", () => {
  it("shows 'No recent activity' when lastDeliveryAt is null", () => {
    render(
      <BotHealthIndicator
        lastDeliveryAt={null}
        recentFailureCount={0}
        totalDeliveries24h={0}
      />
    );
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(screen.getByText("0 delivered")).toBeInTheDocument();
  });

  it("shows delivery count badge", () => {
    render(
      <BotHealthIndicator
        lastDeliveryAt={new Date().toISOString()}
        recentFailureCount={0}
        totalDeliveries24h={42}
      />
    );
    expect(screen.getByText("42 delivered")).toBeInTheDocument();
  });

  it("shows failure badge when failures > 0", () => {
    render(
      <BotHealthIndicator
        lastDeliveryAt={new Date().toISOString()}
        recentFailureCount={3}
        totalDeliveries24h={10}
      />
    );
    expect(screen.getByText("3 failed")).toBeInTheDocument();
  });

  it("does not show failure badge when failures = 0", () => {
    render(
      <BotHealthIndicator
        lastDeliveryAt={new Date().toISOString()}
        recentFailureCount={0}
        totalDeliveries24h={10}
      />
    );
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
  });
});
