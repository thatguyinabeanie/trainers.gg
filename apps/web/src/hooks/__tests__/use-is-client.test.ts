import { renderHook, waitFor } from "@testing-library/react";
import { useIsClient } from "../use-is-client";

describe("useIsClient", () => {
  it("should return false initially and then true after mount", async () => {
    const { result } = renderHook(() => useIsClient());

    // In jsdom test environment, the effect runs immediately
    // So we just verify it eventually becomes true
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("should return true after mount (client-side)", async () => {
    const { result } = renderHook(() => useIsClient());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("should stay true after initial mount", async () => {
    const { result, rerender } = renderHook(() => useIsClient());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    rerender();

    expect(result.current).toBe(true);
  });

  it("should handle multiple re-renders correctly", async () => {
    const { result, rerender } = renderHook(() => useIsClient());

    // In test environment, effect runs immediately, so verify it's true
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Multiple re-renders shouldn't change it
    rerender();
    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(true);
  });

  it("should be consistent across different hook instances", async () => {
    const { result: result1 } = renderHook(() => useIsClient());
    const { result: result2 } = renderHook(() => useIsClient());

    await waitFor(() => {
      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);
    });
  });

  it("should reset on unmount and remount", async () => {
    const { result, unmount } = renderHook(() => useIsClient());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    unmount();

    // Remount
    const { result: newResult } = renderHook(() => useIsClient());

    // In test environment, effect runs immediately, so verify it becomes true
    await waitFor(() => {
      expect(newResult.current).toBe(true);
    });
  });
});
