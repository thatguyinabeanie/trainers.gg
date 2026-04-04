import { render, screen, act } from "@testing-library/react";
import { SudoModeIndicator } from "../sudo-mode-indicator";

const mockCheckSudoStatus = jest.fn();
jest.mock("@/lib/sudo/actions", () => ({
  checkSudoStatus: (...args: unknown[]) => mockCheckSudoStatus(...args),
}));

describe("SudoModeIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when sudo is inactive", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: false,
    });
    const { container } = render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the sudo mode badge and border when sudo is active", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: true,
      isSiteAdmin: true,
    });
    render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
  });

  it("polls checkSudoStatus every 30 seconds", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: true,
    });
    render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockCheckSudoStatus).toHaveBeenCalledTimes(2);
  });

  it("updates to active when poll returns isActive=true", async () => {
    mockCheckSudoStatus
      .mockResolvedValueOnce({ isActive: false, isSiteAdmin: true })
      .mockResolvedValueOnce({ isActive: true, isSiteAdmin: true });

    render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText("Sudo Mode Active")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
  });

  it("clears the polling interval on unmount", () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: false,
    });
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = render(<SudoModeIndicator />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("hides the border overlay when sudo is inactive", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: false,
    });
    const { container } = render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    // aria-hidden border div is not rendered when inactive
    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument();
  });

  it("renders aria-hidden border overlay when sudo is active", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: true,
      isSiteAdmin: true,
    });
    const { container } = render(<SudoModeIndicator />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
