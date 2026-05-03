import { act, renderHook } from "@testing-library/react";

import { useTeamLayout } from "../use-team-layout";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
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
    window.localStorage.setItem("tg.team-layout", "2x3");
    const { result } = renderHook(() => useTeamLayout());
    expect(result.current.mode).toBe("2x3");
  });

  it("persists changes via setMode", () => {
    const { result } = renderHook(() => useTeamLayout());
    act(() => result.current.setMode("3x2-mid"));
    expect(window.localStorage.getItem("tg.team-layout")).toBe("3x2-mid");
    expect(result.current.mode).toBe("3x2-mid");
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
    act(() => a.current.setMode("3x2-stack"));
    expect(b.current.mode).toBe("3x2-stack");
  });
});
