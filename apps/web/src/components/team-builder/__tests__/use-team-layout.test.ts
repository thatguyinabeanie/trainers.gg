import { act, renderHook } from "@testing-library/react";

import { useTeamLayout } from "../use-team-layout";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  window.localStorage.clear();
});

describe("useTeamLayout", () => {
  it("defaults to 1x6 when nothing is persisted", () => {
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("1x6");
    expect(result.current.persisted).toBe("1x6");
    expect(result.current.isMobileLocked).toBe(false);
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

  describe("URL param sync", () => {
    it("?layout=compact yields 1x6 and mirrors to localStorage", () => {
      mockSearchParams = new URLSearchParams("layout=compact");
      // Pre-seed storage with a different value to verify URL wins + mirror.
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.persisted).toBe("1x6");
      expect(window.localStorage.getItem("tg.team-layout")).toBe("1x6");
    });

    it("?layout=grid yields 2x3-vertical", () => {
      mockSearchParams = new URLSearchParams("layout=grid");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("2x3-vertical");
      expect(window.localStorage.getItem("tg.team-layout")).toBe(
        "2x3-vertical"
      );
    });

    it("ignores unrecognised URL values and falls back to localStorage", () => {
      mockSearchParams = new URLSearchParams("layout=garbage");
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
      expect(result.current.persisted).toBe("2x3-vertical");
    });

    it("ignores unrecognised URL values and uses default when storage is empty", () => {
      mockSearchParams = new URLSearchParams("layout=garbage");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
    });

    it("URL takes precedence over localStorage when both are set", () => {
      mockSearchParams = new URLSearchParams("layout=grid");
      window.localStorage.setItem("tg.team-layout", "1x6");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("2x3-vertical");
    });

    it("setMode('2x3-vertical') calls router.replace with ?layout=grid", () => {
      const { result } = renderHook(() => useTeamLayout());
      act(() => result.current.setMode("2x3-vertical"));
      expect(mockReplace).toHaveBeenCalledWith("?layout=grid", {
        scroll: false,
      });
    });

    it("setMode('1x6') calls router.replace with ?layout=compact", () => {
      const { result } = renderHook(() => useTeamLayout());
      act(() => result.current.setMode("1x6"));
      expect(mockReplace).toHaveBeenCalledWith("?layout=compact", {
        scroll: false,
      });
    });

    it("setMode preserves other existing search params", () => {
      mockSearchParams = new URLSearchParams("foo=bar&layout=compact");
      const { result } = renderHook(() => useTeamLayout());
      act(() => result.current.setMode("2x3-vertical"));
      const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
      const params = new URLSearchParams(lastCall.replace(/^\?/, ""));
      expect(params.get("foo")).toBe("bar");
      expect(params.get("layout")).toBe("grid");
    });
  });

  describe("mobile lock", () => {
    it("forces 1x6 regardless of persisted value", () => {
      mockUseIsMobile.mockReturnValue(true);
      window.localStorage.setItem("tg.team-layout", "2x3-vertical");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isMobileLocked).toBe(true);
      expect(result.current.persisted).toBe("2x3-vertical");
    });

    it("forces 1x6 even when URL requests grid", () => {
      mockUseIsMobile.mockReturnValue(true);
      mockSearchParams = new URLSearchParams("layout=grid");
      const { result } = renderHook(() => useTeamLayout());
      expect(result.current.mode).toBe("1x6");
      expect(result.current.isMobileLocked).toBe(true);
      // URL value still wins as the persisted preference for when the user
      // returns to a non-mobile viewport.
      expect(result.current.persisted).toBe("2x3-vertical");
    });
  });
});
