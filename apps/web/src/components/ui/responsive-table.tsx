"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  React.useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [checkScroll]);

  return (
    <div className="relative">
      {/* Left shadow */}
      <div
        className={cn(
          "from-background pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-4 bg-gradient-to-r to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className={cn("overflow-x-auto", className)}
      >
        {children}
      </div>

      {/* Right shadow */}
      <div
        className={cn(
          "from-background pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-4 bg-gradient-to-l to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
