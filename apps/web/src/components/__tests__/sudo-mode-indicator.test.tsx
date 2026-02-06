import { render, screen, waitFor } from "@testing-library/react";
import { SudoModeIndicator } from "../sudo-mode-indicator";
import { checkSudoStatus } from "@/lib/sudo/actions";

// Mock sudo actions
jest.mock("@/lib/sudo/actions", () => ({
  checkSudoStatus: jest.fn(),
}));

const mockCheckSudoStatus = checkSudoStatus as jest.MockedFunction<
  typeof checkSudoStatus
>;

describe("SudoModeIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Sudo mode inactive", () => {
    it("renders nothing when sudo mode is not active", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText("Sudo Mode Active")).not.toBeInTheDocument();
    });

    it("does not render border when sudo mode is inactive", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: false,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      const border = container.querySelector('[class*="border-primary"]');
      expect(border).not.toBeInTheDocument();
    });
  });

  describe("Sudo mode active", () => {
    it("renders border and badge when sudo mode is active", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      // Check for teal border
      const border = container.querySelector(".border-primary");
      expect(border).toBeInTheDocument();
      expect(border).toHaveClass("fixed", "inset-0", "border-4");

      // Check for badge
      expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
    });

    it("renders ShieldAlert icon in badge", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const icon = container.querySelector("svg.lucide-shield-alert");
      expect(icon).toBeInTheDocument();
    });

    it("positions badge in bottom right corner", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const badge = screen.getByText("Sudo Mode Active").parentElement;
      expect(badge).toHaveClass("fixed", "right-4", "bottom-4");
    });

    it("border is pointer-events-none to not block clicks", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const border = container.querySelector(".border-primary");
      expect(border).toHaveClass("pointer-events-none");
    });

    it("border and badge have correct z-index", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const border = container.querySelector(".border-primary");
      expect(border).toHaveClass("z-[9999]");

      const badge = screen.getByText("Sudo Mode Active").parentElement;
      expect(badge).toHaveClass("z-[9999]");
    });

    it("border is marked as aria-hidden", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const border = container.querySelector(".border-primary");
      expect(border).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Status polling", () => {
    it("checks sudo status on mount", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: true,
      });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
      });
    });

    it("polls for sudo status every 30 seconds", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds and flush promises
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Flush promise queue

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(2);
      });

      // Fast-forward another 30 seconds and flush promises
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Flush promise queue

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(3);
      });
    });

    it("updates UI when sudo status changes from inactive to active", async () => {
      mockCheckSudoStatus
        .mockResolvedValueOnce({
          isActive: false,
          isSiteAdmin: true,
        })
        .mockResolvedValueOnce({
          isActive: true,
          isSiteAdmin: true,
        });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.queryByText("Sudo Mode Active")).not.toBeInTheDocument();
      });

      // Fast-forward 30 seconds and flush promises
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Flush promise queue

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });
    });

    it("updates UI when sudo status changes from active to inactive", async () => {
      mockCheckSudoStatus
        .mockResolvedValueOnce({
          isActive: true,
          isSiteAdmin: true,
        })
        .mockResolvedValueOnce({
          isActive: false,
          isSiteAdmin: true,
        });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      // Fast-forward 30 seconds and flush promises
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Flush promise queue

      await waitFor(() => {
        expect(screen.queryByText("Sudo Mode Active")).not.toBeInTheDocument();
      });
    });

    it("clears interval on unmount", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { unmount } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward 30 seconds after unmount
      jest.advanceTimersByTime(30000);

      // Should not call again after unmount
      expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe("Visual styling", () => {
    it("border has teal color (primary)", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const border = container.querySelector(".border-primary");
      expect(border).toHaveClass("border-primary");
    });

    it("badge has primary background and foreground", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const badge = screen.getByText("Sudo Mode Active").parentElement;
      expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("badge has shadow for visibility", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
      });

      const badge = screen.getByText("Sudo Mode Active").parentElement;
      expect(badge).toHaveClass("shadow-lg");
    });
  });

  describe("Error handling", () => {
    it("handles checkSudoStatus rejection gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockCheckSudoStatus.mockRejectedValue(new Error("Network error"));

      const { container } = render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      // Should render nothing on error
      expect(container.firstChild).toBeNull();

      consoleError.mockRestore();
    });

    it("continues polling after error", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockCheckSudoStatus
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          isActive: true,
          isSiteAdmin: true,
        });

      render(<SudoModeIndicator />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds and flush promises
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Flush promise queue

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalledTimes(2);
      });

      consoleError.mockRestore();
    });
  });
});
