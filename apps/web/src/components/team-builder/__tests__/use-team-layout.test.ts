import { act, renderHook } from "@testing-library/react";

import { useTeamLayout } from "../use-team-layout";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  // Trigger the resize listener that useSyncExternalStore subscribes to
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
  window.localStorage.clear();
  // Default to a wide viewport so existing tests that don't care about
  // auto-degrade keep their original behaviour.
  setViewportWidth(2400);
});

describe("useTeamLayout", () => {
  it("defaults to 1x6 when nothing is persisted", () => {
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("1x6");
    expect(result.current.persisted).toBe("1x6");
    expect(result.current.isMobileLocked).toBe(false);
    expect(result.current.isAutoDegraded).toBe(false);
  });

  it("returns the persisted mode when set", () => {
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("2x3-vertical");
  });

  it("persists changes via setMode", () => {
    const { result } = renderHook(() => useTeamLayout());
    act(() => result.current.setMode("2x3-vertical"));
    expect(window.localStorage.getItem("tg.team-layout")).toBe("2x3-vertical");
    expect(result.current.mode).toBe("2x3-vertical");
  });

  it("forces 1x6 on mobile but preserves the persisted value", () => {
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    mockUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("1x6");
    expect(result.current.persisted).toBe("2x3-vertical");
    expect(result.current.isMobileLocked).toBe(true);
  });

  it("rejects invalid persisted values and falls back to default", () => {
    window.localStorage.setItem("tg.team-layout", "not-a-mode");
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("1x6");
  });

  it("syncs across multiple consumers in the same tab", () => {
    const { result: a } = renderHook(() => useTeamLayout());
    const { result: b } = renderHook(() => useTeamLayout());
    act(() => a.current.setMode("2x3-vertical"));
    expect(b.current.mode).toBe("2x3-vertical");
  });

  describe("backward-compat migration", () => {
    it("migrates legacy 3x2-mid localStorage value to 2x3-vertical", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-mid");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("2x3-vertical");
      expect(window.localStorage.getItem("tg.team-layout")).toBe(
        "2x3-vertical"
      );
    });

    it("migrates removed 3x2 mid-stack mode to 2x3-vertical", () => {
      window.localStorage.setItem("tg.team-layout", "3x2");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("2x3-vertical");
      expect(window.localStorage.getItem("tg.team-layout")).toBe(
        "2x3-vertical"
      );
    });

    it("migrates 3x2-stack localStorage value to 2x3-vertical", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-stack");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("2x3-vertical");
      expect(window.localStorage.getItem("tg.team-layout")).toBe(
        "2x3-vertical"
      );
    });
  });

  describe("auto-degrade", () => {
    it.each([
      // [persisted, viewport, expectedMode, expectedDegraded]
      ["2x3-vertical", 1800, "1x6", true],
      ["2x3-vertical", 1200, "1x6", true],
      ["2x3-vertical", 2400, "2x3-vertical", false],
      ["1x6", 800, "1x6", false],
    ] as const)(
      "persisted=%s at %dpx → mode=%s, degraded=%s",
      (persisted, width, expectedMode, expectedDegraded) => {
        window.localStorage.setItem("tg.team-layout", persisted);
        setViewportWidth(width);
        const { result } = renderHook(() => useTeamLayout());
        expect(result.current.mode).toBe(expectedMode);
        expect(result.current.isAutoDegraded).toBe(expectedDegraded);
      }
    );

    it("preserves persisted value when auto-degraded", () => {
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      setViewportWidth(1800);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.persisted).toBe("2x3-vertical");
    });

    it("mobile override beats viewport-based degrade", () => {
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      mockUseIsMobile.mockReturnValue(true);
      setViewportWidth(2400);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isMobileLocked).toBe(true);
    });
  });
});
