import { act, renderHook, waitFor } from "@testing-library/react";

import { DEFAULT_BUILDER_PREFERENCES } from "@trainers/validators";

import { useBuilderPreferences } from "../use-builder-preferences";

const mockGet = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/actions/builder-preferences", () => ({
  getBuilderPreferencesAction: () => mockGet(),
  updateBuilderPreferencesAction: (p: unknown) => mockUpdate(p),
}));

const STORAGE_KEY = "trainersgg.builder.preferences.v1";

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockUpdate.mockReset();
  mockGet.mockResolvedValue({ success: true, data: { preferences: null } });
  mockUpdate.mockResolvedValue({ success: true, data: { success: true } });
});

describe("useBuilderPreferences", () => {
  it("returns defaults when signed out and no localStorage", () => {
    const { result } = renderHook(() => useBuilderPreferences(false));
    expect(result.current.preferences).toEqual(DEFAULT_BUILDER_PREFERENCES);
  });

  it("hydrates from localStorage when signed out", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ speedTiers: { defaultView: "sidepane", openOnLoad: true } })
    );
    const { result } = renderHook(() => useBuilderPreferences(false));
    await waitFor(() =>
      expect(result.current.preferences.speedTiers.defaultView).toBe("sidepane")
    );
  });

  it("account value wins over localStorage when signed in", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ speedTiers: { defaultView: "sidepane", openOnLoad: true } })
    );
    mockGet.mockResolvedValue({
      success: true,
      data: {
        preferences: { speedTiers: { defaultView: "dialog", openOnLoad: false } },
      },
    });
    const { result } = renderHook(() => useBuilderPreferences(true));
    await waitFor(() =>
      expect(result.current.preferences.speedTiers.defaultView).toBe("dialog")
    );
  });

  it("adopts localStorage to the account when signed in with no account row", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ speedTiers: { defaultView: "sidepane", openOnLoad: true } })
    );
    mockGet.mockResolvedValue({ success: true, data: { preferences: null } });
    const { result } = renderHook(() => useBuilderPreferences(true));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(result.current.preferences.speedTiers.defaultView).toBe("sidepane");
  });

  it("setPreferences persists to localStorage and account", async () => {
    const { result } = renderHook(() => useBuilderPreferences(true));
    act(() => {
      result.current.setPreferences({
        speedTiers: { defaultView: "sidepane", openOnLoad: false },
      });
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).speedTiers.defaultView).toBe(
      "sidepane"
    );
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});
