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
