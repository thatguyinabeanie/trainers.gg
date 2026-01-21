"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if we're running on the client side.
 * This is useful for preventing SSR/SSG issues with client-only code.
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
