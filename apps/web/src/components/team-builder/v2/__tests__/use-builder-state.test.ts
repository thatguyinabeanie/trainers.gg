"use client";

import { act, renderHook } from "@testing-library/react";

import { useBuilderState, type Tweaks } from "../use-builder-state";

// =============================================================================
// Helpers
// =============================================================================

const STORAGE_KEY = "trainersgg.builder.tweaks.v2";

function clearStorage() {
  window.localStorage.clear();
}

// =============================================================================
// Default tweaks (no prior localStorage)
// =============================================================================

describe("useBuilderState — default tweaks", () => {
  beforeEach(clearStorage);

  it("returns density=comfy by default", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.tweaks.density).toBe("comfy");
  });

  it("returns expandMode=active by default", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.tweaks.expandMode).toBe("active");
  });

  it("returns showCalc=true by default", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.tweaks.showCalc).toBe(true);
  });
});

// =============================================================================
// setTweak — localStorage write
// =============================================================================

describe("useBuilderState — setTweak writes to localStorage", () => {
  beforeEach(clearStorage);

  it("persists density change to localStorage", () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useBuilderState());

    act(() => {
      result.current.setTweak("density", "compact");
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"density":"compact"')
    );
    setItemSpy.mockRestore();
  });

  it("persists expandMode change to localStorage", () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useBuilderState());

    act(() => {
      result.current.setTweak("expandMode", "all");
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"expandMode":"all"')
    );
    setItemSpy.mockRestore();
  });

  it("persists showCalc=false to localStorage", () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useBuilderState());

    act(() => {
      result.current.setTweak("showCalc", false);
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"showCalc":false')
    );
    setItemSpy.mockRestore();
  });

  it("updates the in-memory tweaks state immediately after setTweak", () => {
    const { result } = renderHook(() => useBuilderState());

    act(() => {
      result.current.setTweak("density", "compact");
    });

    expect(result.current.tweaks.density).toBe("compact");
  });
});

// =============================================================================
// setTweak — localStorage read on next mount
// =============================================================================

describe("useBuilderState — restores tweaks from localStorage on mount", () => {
  beforeEach(clearStorage);

  it("reads persisted tweaks on re-mount", () => {
    const saved: Tweaks = {
      density: "compact",
      expandMode: "all",
      showCalc: false,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useBuilderState());

    expect(result.current.tweaks.density).toBe("compact");
    expect(result.current.tweaks.expandMode).toBe("all");
    expect(result.current.tweaks.showCalc).toBe(false);
  });

  it("merges partial stored tweaks with defaults (new keys get fallback)", () => {
    // Simulate a partial payload missing 'expandMode' (e.g., old version)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ density: "compact" })
    );

    const { result } = renderHook(() => useBuilderState());

    expect(result.current.tweaks.density).toBe("compact");
    expect(result.current.tweaks.expandMode).toBe("active"); // default
    expect(result.current.tweaks.showCalc).toBe(true); // default
  });

  it("falls back to defaults when localStorage contains invalid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ invalid json");

    const { result } = renderHook(() => useBuilderState());

    expect(result.current.tweaks.density).toBe("comfy");
    expect(result.current.tweaks.expandMode).toBe("active");
    expect(result.current.tweaks.showCalc).toBe(true);
  });
});

// =============================================================================
// Other builder state — ephemeral
// =============================================================================

describe("useBuilderState — ephemeral state defaults", () => {
  beforeEach(clearStorage);

  it("starts with activeIdx=0", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.activeIdx).toBe(0);
  });

  it("starts with calcOpen=true", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.calcOpen).toBe(true);
  });

  it("starts with drawer=null", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.drawer).toBe(null);
  });

  it("setActiveIdx updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setActiveIdx(3);
    });
    expect(result.current.activeIdx).toBe(3);
  });

  it("setDrawer updates the drawer value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setDrawer("matchups");
    });
    expect(result.current.drawer).toBe("matchups");
  });

  it("setCalcOpen accepts an updater function", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setCalcOpen((prev) => !prev);
    });
    expect(result.current.calcOpen).toBe(false);
  });

  it("field defaults to doubles=true", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.field.doubles).toBe(true);
  });

  it("setField replaces the full field state", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setField({ ...result.current.field, tailwind: true });
    });
    expect(result.current.field.tailwind).toBe(true);
  });
});
