"use client";

import { act, renderHook } from "@testing-library/react";

import { useBuilderState } from "../use-builder-state";

// =============================================================================
// Helpers
// =============================================================================

function clearStorage() {
  window.localStorage.clear();
}

// =============================================================================
// Builder state defaults & updates
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

// =============================================================================
// calcDrawerWidth — localStorage persistence + clamping
// =============================================================================

describe("useBuilderState — calcDrawerWidth", () => {
  beforeEach(clearStorage);

  it("defaults to 380 when localStorage is empty", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.calcDrawerWidth).toBe(380);
  });

  it("setCalcDrawerWidth(500) updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setCalcDrawerWidth(500);
    });
    expect(result.current.calcDrawerWidth).toBe(500);
  });

  it("setCalcDrawerWidth(700) clamps to 640", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setCalcDrawerWidth(700);
    });
    expect(result.current.calcDrawerWidth).toBe(640);
  });

  it("setCalcDrawerWidth(100) clamps to 320", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setCalcDrawerWidth(100);
    });
    expect(result.current.calcDrawerWidth).toBe(320);
  });

  it("persists to localStorage on set", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setCalcDrawerWidth(500);
    });
    expect(
      window.localStorage.getItem("trainersgg.builder.calcDrawerWidth.v1")
    ).toBe("500");
  });

  it("reads persisted value from localStorage on remount", () => {
    window.localStorage.setItem(
      "trainersgg.builder.calcDrawerWidth.v1",
      "560"
    );
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.calcDrawerWidth).toBe(560);
  });

  it("clamps a persisted out-of-range value on remount", () => {
    window.localStorage.setItem(
      "trainersgg.builder.calcDrawerWidth.v1",
      "999"
    );
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.calcDrawerWidth).toBe(640);
  });
});
