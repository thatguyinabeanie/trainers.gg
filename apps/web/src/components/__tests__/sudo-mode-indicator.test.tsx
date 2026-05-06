import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SudoModeIndicator } from "../sudo-mode-indicator";

const mockCheckSudoStatus = jest.fn();
jest.mock("@/lib/sudo/actions", () => ({
  checkSudoStatus: (...args: unknown[]) => mockCheckSudoStatus(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

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
    const { container } = render(<SudoModeIndicator />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockCheckSudoStatus).toHaveBeenCalled();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the sudo mode badge and border when sudo is active", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: true,
      isSiteAdmin: true,
    });
    render(<SudoModeIndicator />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
    });
  });

  it("polls checkSudoStatus every 30 seconds", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: true,
    });
    render(<SudoModeIndicator />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(mockCheckSudoStatus).toHaveBeenCalledTimes(2);
    });
  });

  it("updates to active when poll returns isActive=true", async () => {
    mockCheckSudoStatus
      .mockResolvedValueOnce({ isActive: false, isSiteAdmin: true })
      .mockResolvedValueOnce({ isActive: true, isSiteAdmin: true });

    render(<SudoModeIndicator />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockCheckSudoStatus).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Sudo Mode Active")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(screen.getByText("Sudo Mode Active")).toBeInTheDocument();
    });
  });

  it("does not render border overlay when sudo is inactive", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: false,
    });
    const { container } = render(<SudoModeIndicator />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockCheckSudoStatus).toHaveBeenCalled();
    });

    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument();
  });

  it("renders aria-hidden border overlay when sudo is active", async () => {
    mockCheckSudoStatus.mockResolvedValue({
      isActive: true,
      isSiteAdmin: true,
    });
    const { container } = render(<SudoModeIndicator />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        container.querySelector("[aria-hidden='true']")
      ).toBeInTheDocument();
    });
  });
});
