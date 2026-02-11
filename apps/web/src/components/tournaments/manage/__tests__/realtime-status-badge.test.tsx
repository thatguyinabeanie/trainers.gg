import { render, screen } from "@testing-library/react";
import { RealtimeStatusBadge } from "../realtime-status-badge";
import userEvent from "@testing-library/user-event";

describe("RealtimeStatusBadge", () => {
  describe("Connected State", () => {
    it("should display green indicator and 'Live' text when connected", () => {
      render(<RealtimeStatusBadge status="connected" />);

      expect(screen.getByText("Live")).toBeInTheDocument();
      const indicator = screen.getByText("Live").previousSibling;
      expect(indicator).toHaveClass("bg-emerald-500");
    });

    it("should not show alert when connected", () => {
      const { container } = render(<RealtimeStatusBadge status="connected" />);

      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
    });
  });

  describe("Disconnected State", () => {
    it("should display reconnecting alert when disconnected", () => {
      render(<RealtimeStatusBadge status="disconnected" />);

      expect(
        screen.getByText("Reconnecting to live updates...")
      ).toBeInTheDocument();
    });

    it("should show amber colored alert for disconnected state", () => {
      const { container } = render(
        <RealtimeStatusBadge status="disconnected" />
      );

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass("border-amber-500/50");
    });
  });

  describe("Error State", () => {
    it("should display error alert when status is error", () => {
      render(<RealtimeStatusBadge status="error" />);

      expect(
        screen.getByText("Live updates disconnected.")
      ).toBeInTheDocument();
    });

    it("should show refresh button in error state", () => {
      render(<RealtimeStatusBadge status="error" />);

      expect(
        screen.getByRole("button", { name: /refresh page/i })
      ).toBeInTheDocument();
    });

    it("should reload page when refresh button is clicked", async () => {
      const user = userEvent.setup();
      const reloadSpy = jest.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(<RealtimeStatusBadge status="error" />);

      const refreshButton = screen.getByRole("button", {
        name: /refresh page/i,
      });
      await user.click(refreshButton);

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it("should show destructive variant alert for error state", () => {
      const { container } = render(<RealtimeStatusBadge status="error" />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
      expect(alert?.className).toContain("destructive");
    });
  });
});
