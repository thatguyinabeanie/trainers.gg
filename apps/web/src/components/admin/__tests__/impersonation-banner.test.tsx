import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationBanner } from "../impersonation-banner";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockEndImpersonationAction = jest.fn();
jest.mock("@/lib/impersonation/actions", () => ({
  endImpersonationAction: (...args: unknown[]) =>
    mockEndImpersonationAction(...args),
}));

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderBanner(startedAt = new Date().toISOString()) {
    return render(
      <ImpersonationBanner targetUsername="ash" startedAt={startedAt} />
    );
  }

  it("renders the target username", () => {
    renderBanner();
    expect(screen.getByText(/@ash/)).toBeInTheDocument();
  });

  it("renders the End button", () => {
    renderBanner();
    expect(screen.getByRole("button", { name: /End/ })).toBeInTheDocument();
  });

  it("shows elapsed time label", () => {
    const startedAt = new Date(Date.now() - 90_000).toISOString(); // 1m 30s ago
    renderBanner(startedAt);
    expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
  });

  it("updates elapsed time every second", () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString(); // 1m ago
    renderBanner(startedAt);

    expect(screen.getByText(/1m 0s/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/1m 5s/)).toBeInTheDocument();
  });

  it("calls endImpersonationAction and refreshes on success", async () => {
    mockEndImpersonationAction.mockResolvedValue({ success: true });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBanner();

    await user.click(screen.getByRole("button", { name: /End/ }));

    await waitFor(() => {
      expect(mockEndImpersonationAction).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows 'Ending...' while the action is pending", async () => {
    mockEndImpersonationAction.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBanner();

    await user.click(screen.getByRole("button", { name: /End/ }));

    expect(screen.getByRole("button", { name: /Ending/ })).toBeDisabled();
  });

  it("clears the interval timer on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    const { unmount } = renderBanner();
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("does not refresh when endImpersonationAction returns failure", async () => {
    mockEndImpersonationAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBanner();

    await user.click(screen.getByRole("button", { name: /End/ }));

    await waitFor(() => {
      expect(mockEndImpersonationAction).toHaveBeenCalled();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
