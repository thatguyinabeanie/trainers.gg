"use client";

import { type RefObject, useEffect, useState } from "react";

const COMPACT_THRESHOLD_PX = 1240;

/**
 * Returns whether the observed element's parent container is at or above
 * the compact-layout threshold (1240px). Default is `true` (compact) for
 * SSR and non-browser environments — matches the previous always-render-
 * compact behaviour and lets tests run without mocking a ResizeObserver.
 *
 * Pass a ref to the IdentityLane root; the hook walks up to the nearest
 * `.slotHost` (the container-query host added in poke-row) and measures
 * its width, so all three layout breakpoints stay synchronised between
 * CSS and JS.
 */
export function useContainerCompact(ref: RefObject<HTMLElement | null>) {
  const [isCompact, setIsCompact] = useState<boolean>(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const slotHost = el.closest("[data-slot-host]");
    const target = slotHost ?? el;

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsCompact(width >= COMPACT_THRESHOLD_PX);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref]);

  return isCompact;
}
