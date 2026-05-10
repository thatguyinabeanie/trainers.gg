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
  let originalInnerWidth: number;

  beforeEach(() => {
    clearStorage();
    originalInnerWidth = window.innerWidth;
    // Simulate desktop so drawers default to open (JSDOM defaults innerWidth=0)
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("starts with activeIdx=0", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.activeIdx).toBe(0);
  });

  it("starts with sideDrawer='speed' on desktop", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.sideDrawer).toBe("speed");
  });

  it("closes sideDrawer and rightDrawer by default on mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.sideDrawer).toBe(null);
    expect(result.current.rightDrawer).toBe(null);
  });

  it("setActiveIdx updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setActiveIdx(3);
    });
    expect(result.current.activeIdx).toBe(3);
  });

  it("setSideDrawer(null) then setBottomDrawer('matchups') opens matchups", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setSideDrawer(null);
    });
    act(() => {
      result.current.setBottomDrawer("matchups");
    });
    expect(result.current.bottomDrawer).toBe("matchups");
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
// split drawer state — rightDrawer for calc
// =============================================================================

describe("useBuilderState — rightDrawer (calc)", () => {
  beforeEach(clearStorage);

  it("setRightDrawer('calc') opens the calc panel", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setRightDrawer("calc");
    });
    expect(result.current.rightDrawer).toBe("calc");
  });

  it("setRightDrawer(null) closes the calc panel", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setRightDrawer("calc");
    });
    act(() => {
      result.current.setRightDrawer(null);
    });
    expect(result.current.rightDrawer).toBe(null);
  });
});

// =============================================================================
// Calc workspace tweaks — attackerSlot, faintedYours, faintedTheirs
// =============================================================================

describe("useBuilderState — attackerSlot", () => {
  beforeEach(clearStorage);

  it("defaults to null", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.attackerSlot).toBe(null);
  });

  it("setAttackerSlot(2) updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setAttackerSlot(2);
    });
    expect(result.current.attackerSlot).toBe(2);
  });

  it("setAttackerSlot(null) clears the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setAttackerSlot(3);
    });
    act(() => {
      result.current.setAttackerSlot(null);
    });
    expect(result.current.attackerSlot).toBe(null);
  });

  it("persists slot to localStorage on set", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setAttackerSlot(4);
    });
    expect(
      window.localStorage.getItem("trainersgg.builder.attackerSlot.v1")
    ).toBe("4");
  });

  it("removes localStorage entry when set to null", () => {
    window.localStorage.setItem("trainersgg.builder.attackerSlot.v1", "2");
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setAttackerSlot(null);
    });
    expect(
      window.localStorage.getItem("trainersgg.builder.attackerSlot.v1")
    ).toBe(null);
  });

  it("reads persisted value from localStorage on remount", () => {
    window.localStorage.setItem("trainersgg.builder.attackerSlot.v1", "1");
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.attackerSlot).toBe(1);
  });
});

describe("useBuilderState — faintedYours", () => {
  beforeEach(clearStorage);

  it("defaults to 0", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.faintedYours).toBe(0);
  });

  it("setFaintedYours(3) updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedYours(3);
    });
    expect(result.current.faintedYours).toBe(3);
  });

  it("setFaintedYours(9) clamps to 5", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedYours(9);
    });
    expect(result.current.faintedYours).toBe(5);
  });

  it("setFaintedYours(-2) clamps to 0", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedYours(-2);
    });
    expect(result.current.faintedYours).toBe(0);
  });

  it("persists to localStorage on set", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedYours(2);
    });
    expect(
      window.localStorage.getItem("trainersgg.builder.faintedYours.v1")
    ).toBe("2");
  });

  it("reads persisted value from localStorage on remount", () => {
    window.localStorage.setItem("trainersgg.builder.faintedYours.v1", "4");
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.faintedYours).toBe(4);
  });
});

describe("useBuilderState — faintedTheirs", () => {
  beforeEach(clearStorage);

  it("defaults to 0", () => {
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.faintedTheirs).toBe(0);
  });

  it("setFaintedTheirs(5) updates the value", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedTheirs(5);
    });
    expect(result.current.faintedTheirs).toBe(5);
  });

  it("setFaintedTheirs(10) clamps to 5", () => {
    const { result } = renderHook(() => useBuilderState());
    act(() => {
      result.current.setFaintedTheirs(10);
    });
    expect(result.current.faintedTheirs).toBe(5);
  });

  it("reads persisted value from localStorage on remount", () => {
    window.localStorage.setItem("trainersgg.builder.faintedTheirs.v1", "3");
    const { result } = renderHook(() => useBuilderState());
    expect(result.current.faintedTheirs).toBe(3);
  });
});
