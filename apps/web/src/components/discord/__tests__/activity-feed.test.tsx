/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { ActivityFeed } from "../activity-feed";

const activities = [
  {
    id: 1,
    type: "channel",
    eventType: "tournament_created",
    target: "general",
    metadata: {},
    createdAt: "2026-01-01T12:00:00Z",
  },
  {
    id: 2,
    type: "dm",
    eventType: "match_ready",
    target: "ash_ketchum",
    metadata: {},
    createdAt: "2026-01-01T11:00:00Z",
  },
  {
    id: 3,
    type: "role_sync",
    eventType: "verified",
    target: "user-123",
    metadata: {},
    createdAt: "2026-01-01T10:00:00Z",
  },
];

describe("ActivityFeed", () => {
  it("renders 'No recent activity' when empty", () => {
    render(<ActivityFeed activities={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<ActivityFeed activities={[]} isLoading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders activity descriptions for channel type", () => {
    render(<ActivityFeed activities={activities} />);
    expect(
      screen.getByText("Sent tournament_created to #general")
    ).toBeInTheDocument();
  });

  it("renders activity descriptions for dm type", () => {
    render(<ActivityFeed activities={activities} />);
    expect(
      screen.getByText("DM'd match_ready to @ash_ketchum")
    ).toBeInTheDocument();
  });

  it("renders activity descriptions for role_sync type", () => {
    render(<ActivityFeed activities={activities} />);
    expect(
      screen.getByText("Synced role verified for user-123")
    ).toBeInTheDocument();
  });

  it("shows 'View all' when more than 20 activities", () => {
    const manyActivities = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      type: "channel",
      eventType: "test",
      target: "ch",
      metadata: {},
      createdAt: "2026-01-01T00:00:00Z",
    }));
    render(<ActivityFeed activities={manyActivities} />);
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("renders the card title", () => {
    render(<ActivityFeed activities={activities} />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });
});
