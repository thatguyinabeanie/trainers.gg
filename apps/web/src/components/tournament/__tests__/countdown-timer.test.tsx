/**
 * Tests for CountdownTimer component in tournament-sidebar-card.tsx
 *
 * Note: CountdownTimer is an internal component, so we're testing it through
 * the parent TournamentSidebarCard component or by temporarily exporting it.
 *
 * For now, we'll create a standalone version of the component for testing
 * that matches the implementation in tournament-sidebar-card.tsx
 */

import { render, screen, waitFor } from "@testing-library/react";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// Standalone version matching the implementation in tournament-sidebar-card.tsx
function CountdownTimer({ targetDate }: { targetDate: string | null }) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(null);
      return;
    }

    // Validate date string to prevent NaN calculations
    const targetTimestamp = new Date(targetDate).getTime();
    if (Number.isNaN(targetTimestamp)) {
      console.error(`[CountdownTimer] Invalid date string: "${targetDate}"`);
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeRemaining) return null;

  const parts = [];
  if (timeRemaining.days > 0) {
    parts.push(`${timeRemaining.days}d`);
  }
  if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
    parts.push(`${timeRemaining.hours}h`);
  }
  parts.push(`${timeRemaining.minutes}m`);
  parts.push(`${timeRemaining.seconds}s`);

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      <span
        className="font-mono text-xs text-amber-600"
        data-testid="countdown"
      >
        {parts.join(" ")}
      </span>
    </div>
  );
}

describe("CountdownTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-10T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders null when targetDate is null", () => {
    const { container } = render(<CountdownTimer targetDate={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when target date is in the past", () => {
    const pastDate = "2026-02-10T11:00:00Z"; // 1 hour ago
    const { container } = render(<CountdownTimer targetDate={pastDate} />);
    expect(container.firstChild).toBeNull();
  });

  it("displays countdown with days, hours, minutes, seconds", () => {
    // 2 days, 5 hours, 30 minutes, 45 seconds from now
    const futureDate = new Date("2026-02-12T17:30:45Z").toISOString();

    render(<CountdownTimer targetDate={futureDate} />);

    expect(screen.getByTestId("countdown")).toHaveTextContent("2d 5h 30m 45s");
  });

  it("displays countdown without days when less than 24 hours remain", () => {
    // 5 hours, 30 minutes, 45 seconds from now
    const futureDate = new Date("2026-02-10T17:30:45Z").toISOString();

    render(<CountdownTimer targetDate={futureDate} />);

    expect(screen.getByTestId("countdown")).toHaveTextContent("5h 30m 45s");
  });

  it("displays countdown without hours when less than 1 hour remains", () => {
    // 30 minutes, 45 seconds from now
    const futureDate = new Date("2026-02-10T12:30:45Z").toISOString();

    render(<CountdownTimer targetDate={futureDate} />);

    const text = screen.getByTestId("countdown").textContent;
    expect(text).toMatch(/30m 45s/);
  });

  it("updates countdown every second", async () => {
    // 5 seconds from now
    const futureDate = new Date("2026-02-10T12:00:05Z").toISOString();

    render(<CountdownTimer targetDate={futureDate} />);

    // Initial render: 0m 5s
    expect(screen.getByTestId("countdown")).toHaveTextContent("0m 5s");

    // Advance 1 second
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByTestId("countdown")).toHaveTextContent("0m 4s");
    });

    // Advance another second
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByTestId("countdown")).toHaveTextContent("0m 3s");
    });
  });

  it("disappears when countdown reaches zero", async () => {
    // 2 seconds from now
    const futureDate = new Date("2026-02-10T12:00:02Z").toISOString();

    const { container } = render(<CountdownTimer targetDate={futureDate} />);

    // Initially visible
    expect(screen.getByTestId("countdown")).toBeInTheDocument();

    // Advance to 1 second remaining
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByTestId("countdown")).toHaveTextContent("0m 1s");
    });

    // Advance past the target time
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("cleans up interval on unmount", () => {
    const futureDate = new Date("2026-02-10T13:00:00Z").toISOString();
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = render(<CountdownTimer targetDate={futureDate} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("handles targetDate change", async () => {
    const futureDate1 = new Date("2026-02-10T12:05:00Z").toISOString();
    const futureDate2 = new Date("2026-02-10T12:10:00Z").toISOString();

    const { rerender } = render(<CountdownTimer targetDate={futureDate1} />);

    // Initial: 5 minutes
    expect(screen.getByTestId("countdown")).toHaveTextContent("5m 0s");

    // Change to 10 minutes
    rerender(<CountdownTimer targetDate={futureDate2} />);

    await waitFor(() => {
      expect(screen.getByTestId("countdown")).toHaveTextContent("10m 0s");
    });
  });

  it("handles transition from null to valid date", async () => {
    const { rerender, container } = render(
      <CountdownTimer targetDate={null} />
    );

    // Initially null
    expect(container.firstChild).toBeNull();

    // Update to valid date
    const futureDate = new Date("2026-02-10T12:05:00Z").toISOString();
    rerender(<CountdownTimer targetDate={futureDate} />);

    await waitFor(() => {
      expect(screen.getByTestId("countdown")).toBeInTheDocument();
      expect(screen.getByTestId("countdown")).toHaveTextContent("5m 0s");
    });
  });

  it("displays hours when days > 0 even if hours = 0", () => {
    // 1 day, 0 hours, 30 minutes from now
    const futureDate = new Date("2026-02-11T12:30:00Z").toISOString();

    render(<CountdownTimer targetDate={futureDate} />);

    expect(screen.getByTestId("countdown")).toHaveTextContent("1d 0h 30m 0s");
  });

  it("handles malformed date strings gracefully", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { container } = render(
      <CountdownTimer targetDate="invalid-date-string" />
    );

    // Should render null for invalid date
    expect(container.firstChild).toBeNull();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CountdownTimer] Invalid date string: "invalid-date-string"'
    );

    consoleErrorSpy.mockRestore();
  });

  it("prevents NaN calculations from creating infinite interval loops", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<CountdownTimer targetDate="not-a-date" />);

    // Should not create interval for invalid date
    expect(setIntervalSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
