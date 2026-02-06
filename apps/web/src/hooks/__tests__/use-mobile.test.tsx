import { renderHook, act, waitFor } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

describe("useIsMobile", () => {
  const MOBILE_BREAKPOINT = 768;

  // Mock matchMedia
  let mockMatchMedia: jest.Mock;
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];

  beforeEach(() => {
    listeners = [];

    mockMatchMedia = jest.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(
        (event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            listeners.push(listener);
          }
        }
      ),
      removeEventListener: jest.fn(
        (event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            listeners = listeners.filter((l) => l !== listener);
          }
        }
      ),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    listeners = [];
  });

  it("should return false for desktop width initially", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("should return true for mobile width initially", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("should update when window is resized to mobile width", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 375,
      });

      // Trigger the change listener
      listeners.forEach((listener) => {
        listener({} as MediaQueryListEvent);
      });
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("should update when window is resized to desktop width", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);

    // Simulate resize to desktop
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 1024,
      });

      // Trigger the change listener
      listeners.forEach((listener) => {
        listener({} as MediaQueryListEvent);
      });
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("should handle width exactly at breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: MOBILE_BREAKPOINT,
    });

    const { result } = renderHook(() => useIsMobile());

    // At the breakpoint, should be desktop (not less than breakpoint)
    expect(result.current).toBe(false);
  });

  it("should handle width one pixel below breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: MOBILE_BREAKPOINT - 1,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("should create matchMedia query with correct breakpoint", () => {
    renderHook(() => useIsMobile());

    expect(mockMatchMedia).toHaveBeenCalledWith(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );
  });

  it("should remove event listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());

    const addEventListenerCalls =
      mockMatchMedia.mock.results[0].value.addEventListener.mock.calls.length;
    expect(addEventListenerCalls).toBeGreaterThan(0);

    unmount();

    const removeEventListenerCalls =
      mockMatchMedia.mock.results[0].value.removeEventListener.mock.calls
        .length;
    expect(removeEventListenerCalls).toBe(addEventListenerCalls);
  });

  it("should handle multiple resize events", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Resize to mobile
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 375,
      });
      listeners.forEach((listener) => listener({} as MediaQueryListEvent));
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Resize back to desktop
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 1024,
      });
      listeners.forEach((listener) => listener({} as MediaQueryListEvent));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Resize to tablet
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 768,
      });
      listeners.forEach((listener) => listener({} as MediaQueryListEvent));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("should return false for undefined initially (SSR compatibility)", () => {
    // Before the effect runs, isMobile is undefined but coerced to false
    const { result } = renderHook(() => useIsMobile());

    // The hook coerces undefined to false with !!isMobile
    expect(typeof result.current).toBe("boolean");
  });
});
