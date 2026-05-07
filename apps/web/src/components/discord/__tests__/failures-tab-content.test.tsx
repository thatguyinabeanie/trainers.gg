/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockListRecentFailuresAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  listRecentFailuresAction: (...args: unknown[]) =>
    mockListRecentFailuresAction(...args),
}));

const mockToast = { error: jest.fn() };
jest.mock("sonner", () => ({ toast: mockToast }));

// Mock FailuresTable since it's tested separately
jest.mock("../failures-table", () => ({
  FailuresTable: (props: Record<string, unknown>) => (
    <div data-testid="failures-table" data-server-id={props.serverId}>
      FailuresTable
    </div>
  ),
}));

import { FailuresTabContent } from "../failures-tab-content";

describe("FailuresTabContent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders failure count message (plural)", () => {
    render(<FailuresTabContent failureCount={5} serverId={1} />);
    expect(screen.getByText(/5 failures in the last 24h/)).toBeInTheDocument();
  });

  it("renders failure count message (singular)", () => {
    render(<FailuresTabContent failureCount={1} serverId={1} />);
    expect(screen.getByText(/1 failure in the last 24h/)).toBeInTheDocument();
  });

  it("renders Load details button", () => {
    render(<FailuresTabContent failureCount={3} serverId={1} />);
    expect(
      screen.getByRole("button", { name: /load details/i })
    ).toBeInTheDocument();
  });

  it("loads details on click and renders FailuresTable", async () => {
    mockListRecentFailuresAction.mockResolvedValue({
      success: true,
      data: {
        channelFailures: [{ id: 1 }],
        dmFailures: [],
        roleSyncFailures: [],
      },
    });

    const user = userEvent.setup();
    render(<FailuresTabContent failureCount={1} serverId={42} />);

    await user.click(
      screen.getByRole("button", { name: /load details/i })
    );

    expect(mockListRecentFailuresAction).toHaveBeenCalledWith(42);
    expect(screen.getByTestId("failures-table")).toBeInTheDocument();
    expect(screen.getByTestId("failures-table")).toHaveAttribute(
      "data-server-id",
      "42"
    );
  });

  it("shows error toast on load failure", async () => {
    mockListRecentFailuresAction.mockResolvedValue({
      success: false,
      error: "Failed to fetch",
    });

    const user = userEvent.setup();
    render(<FailuresTabContent failureCount={1} serverId={1} />);

    await user.click(
      screen.getByRole("button", { name: /load details/i })
    );

    expect(mockToast.error).toHaveBeenCalledWith("Failed to fetch");
    // Should still show the load button (not the table)
    expect(screen.queryByTestId("failures-table")).not.toBeInTheDocument();
  });
});
