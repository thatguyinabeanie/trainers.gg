import { render, screen, waitFor } from "@testing-library/react";
import { RoundTimer } from "../round-timer";

describe("RoundTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders time remaining in MM:SS format", () => {
    const startTime = new Date().toISOString();
    const durationMinutes = 50;

    render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    expect(screen.getByText(/remaining$/)).toBeInTheDocument();
    expect(screen.getByText(/^\d{1,2}:\d{2} remaining$/)).toBeInTheDocument();
  });

  it("updates every second", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // Started 10 minutes ago
    const durationMinutes = 50; // 50 minute duration = 40 minutes remaining

    const { rerender } = render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    // Initial state: 40 minutes remaining
    expect(screen.getByText(/40:\d{2} remaining/)).toBeInTheDocument();

    // Fast forward 1 second
    jest.advanceTimersByTime(1000);

    // Force re-render to see updated time
    rerender(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    // Should now show 39:59 remaining
    expect(screen.getByText(/39:5\d remaining/)).toBeInTheDocument();
  });

  it("shows green text when plenty of time remains (>= 5 minutes)", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // Started 10 minutes ago
    const durationMinutes = 50; // 40 minutes remaining

    const { container } = render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    const timerDiv = container.querySelector("div");
    expect(timerDiv).not.toHaveClass("text-amber-600");
    expect(timerDiv).not.toHaveClass("text-red-600");
  });

  it("shows amber text and pulse animation when running low (< 5 minutes)", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 46 * 60 * 1000).toISOString(); // Started 46 minutes ago
    const durationMinutes = 50; // 4 minutes remaining

    const { container } = render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    const timerDiv = container.querySelector("div");
    expect(timerDiv).toHaveClass("text-amber-600");
    expect(timerDiv).toHaveClass("animate-pulse");
  });

  it("shows red text and 'Time Expired' when time is up", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // Started 60 minutes ago
    const durationMinutes = 50; // Expired 10 minutes ago

    const { container } = render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    const timerDiv = container.querySelector("div");
    expect(timerDiv).toHaveClass("text-red-600");
    expect(screen.getByText("Time Expired")).toBeInTheDocument();
  });

  it("renders compact variant correctly", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const durationMinutes = 50;

    render(
      <RoundTimer
        startTime={startTime}
        durationMinutes={durationMinutes}
        variant="compact"
      />
    );

    // Compact variant shows "40m 0s" format instead of "40:00 remaining"
    expect(screen.getByText(/\d{1,2}m \d{1,2}s/)).toBeInTheDocument();
  });

  it("shows 'Expired' in compact variant when time is up", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const durationMinutes = 50;

    render(
      <RoundTimer
        startTime={startTime}
        durationMinutes={durationMinutes}
        variant="compact"
      />
    );

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("cleans up interval on unmount", () => {
    const startTime = new Date().toISOString();
    const durationMinutes = 50;

    const { unmount } = render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    // Get the number of timers before unmount
    const timersBefore = jest.getTimerCount();

    unmount();

    // After unmount, the interval should be cleared
    const timersAfter = jest.getTimerCount();
    expect(timersAfter).toBeLessThan(timersBefore);
  });

  it("applies custom className", () => {
    const startTime = new Date().toISOString();
    const durationMinutes = 50;

    const { container } = render(
      <RoundTimer
        startTime={startTime}
        durationMinutes={durationMinutes}
        className="custom-class"
      />
    );

    const timerDiv = container.querySelector("div");
    expect(timerDiv).toHaveClass("custom-class");
  });

  it("handles edge case: exactly 0 seconds remaining", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 50 * 60 * 1000).toISOString(); // Started exactly 50 minutes ago
    const durationMinutes = 50;

    render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    expect(screen.getByText("Time Expired")).toBeInTheDocument();
  });

  it("pads seconds with leading zero when less than 10", () => {
    const now = new Date();
    // Set start time so that we have exactly X minutes and 5 seconds remaining
    const startTime = new Date(
      now.getTime() - 44 * 60 * 1000 - 55 * 1000
    ).toISOString();
    const durationMinutes = 50; // Should have 5:05 remaining

    render(
      <RoundTimer startTime={startTime} durationMinutes={durationMinutes} />
    );

    // Should show "5:05 remaining" not "5:5 remaining"
    expect(screen.getByText(/5:0\d remaining/)).toBeInTheDocument();
  });
});
