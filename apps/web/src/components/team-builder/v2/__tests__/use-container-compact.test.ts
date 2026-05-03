import { act, renderHook } from "@testing-library/react";
import { type RefObject } from "react";

import { useContainerCompact } from "../use-container-compact";

let observeCallback: ResizeObserverCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  global.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      observeCallback = cb;
    }
    observe = mockObserve;
    unobserve = jest.fn();
    disconnect = mockDisconnect;
  } as unknown as typeof ResizeObserver;
});

function triggerResize(width: number) {
  observeCallback(
    [{ contentRect: { width } } as ResizeObserverEntry],
    {} as ResizeObserver
  );
}

function makeRef(el: HTMLElement | null): RefObject<HTMLElement | null> {
  return { current: el };
}

describe("useContainerCompact", () => {
  it("returns true (compact) when observed width >= 1240", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);

    const { result } = renderHook(() => useContainerCompact(ref));
    act(() => triggerResize(1400));

    expect(result.current).toBe(true);
  });

  it("returns false when observed width < 1240", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);

    const { result } = renderHook(() => useContainerCompact(ref));
    act(() => triggerResize(1000));

    expect(result.current).toBe(false);
  });

  it("uses [data-slot-host] ancestor if present", () => {
    const host = document.createElement("div");
    host.setAttribute("data-slot-host", "");
    const child = document.createElement("div");
    host.appendChild(child);
    document.body.appendChild(host);

    const ref = makeRef(child);
    renderHook(() => useContainerCompact(ref));

    // The observer should observe the slot host, not the child
    expect(mockObserve).toHaveBeenCalledWith(host);

    document.body.removeChild(host);
  });
});
