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
    window.localStorage.setItem("tg.team-layout", "2x3");
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("2x3");
  });

  it("persists changes via setMode", () => {
    const { result } = renderHook(() => useTeamLayout());
    act(() => result.current.setMode("3x2"));
    expect(window.localStorage.getItem("tg.team-layout")).toBe("3x2");
    expect(result.current.mode).toBe("3x2");
  });

  it("forces 1x6 on mobile but preserves the persisted value", () => {
    window.localStorage.setItem("tg.team-layout", "2x3");
    mockUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("1x6");
    expect(result.current.persisted).toBe("2x3");
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
    act(() => a.current.setMode("3x2-vertical"));
    expect(b.current.mode).toBe("3x2-vertical");
  });

  describe("backward-compat migration", () => {
    it("migrates 3x2-mid localStorage value to 3x2", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-mid");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("3x2");
      expect(result.current.persisted).toBe("3x2");
      expect(window.localStorage.getItem("tg.team-layout")).toBe("3x2");
    });

    it("migrates 3x2-stack localStorage value to 3x2-vertical", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-stack");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("3x2-vertical");
      expect(result.current.persisted).toBe("3x2-vertical");
      expect(window.localStorage.getItem("tg.team-layout")).toBe(
        "3x2-vertical"
      );
    });
  });

  describe("auto-degrade", () => {
    it("degrades 2x3 to 1x6 when viewport is below 1500px", () => {
      window.localStorage.setItem("tg.team-layout", "2x3");
      setViewportWidth(1440);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.persisted).toBe("2x3");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("keeps 2x3 at exactly 1500px", () => {
      window.localStorage.setItem("tg.team-layout", "2x3");
      setViewportWidth(1500);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3");
      expect(result.current.isAutoDegraded).toBe(false);
    });

    it("degrades 3x2 to 2x3 between 1500 and 2199", () => {
      window.localStorage.setItem("tg.team-layout", "3x2");
      setViewportWidth(1800);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3");
      expect(result.current.persisted).toBe("3x2");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("degrades 3x2 all the way to 1x6 below 1500", () => {
      window.localStorage.setItem("tg.team-layout", "3x2");
      setViewportWidth(1200);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("degrades 3x2-vertical to 2x3-vertical between 1500 and 2199", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-vertical");
      setViewportWidth(1800);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("3x2-vertical");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("degrades 3x2-vertical to 1x6 below 1500", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-vertical");
      setViewportWidth(1200);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("degrades 2x3-vertical to 1x6 below 1500", () => {
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      setViewportWidth(1200);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isAutoDegraded).toBe(true);
    });

    it("keeps 3x2-vertical at 2200+", () => {
      window.localStorage.setItem("tg.team-layout", "3x2-vertical");
      setViewportWidth(2400);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("3x2-vertical");
      expect(result.current.isAutoDegraded).toBe(false);
    });

    it("mobile override beats viewport-based degrade", () => {
      window.localStorage.setItem("tg.team-layout", "3x2");
      mockUseIsMobile.mockReturnValue(true);
      setViewportWidth(2400);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isMobileLocked).toBe(true);
    });

    it("isAutoDegraded stays false when persisted is 1x6", () => {
      window.localStorage.setItem("tg.team-layout", "1x6");
      setViewportWidth(800);
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isAutoDegraded).toBe(false);
    });
  });
});
