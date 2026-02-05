"use client";

import { useEffect, useState } from "react";
import { checkSudoStatus } from "@/lib/sudo/actions";
import { ShieldAlert } from "lucide-react";

/**
 * SudoModeIndicator
 *
 * Displays a persistent teal border around the viewport when sudo mode is active.
 * Provides a clear visual indication that the user has elevated admin permissions.
 *
 * This component should be included in the root layout to appear on all pages.
 */
export function SudoModeIndicator() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Check sudo status on mount
    checkSudoStatus().then((status) => setIsActive(status.isActive));

    // Poll for sudo status changes every 30 seconds
    // This ensures the indicator updates if sudo expires or is toggled elsewhere
    const interval = setInterval(async () => {
      const status = await checkSudoStatus();
      setIsActive(status.isActive);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Teal border around viewport */}
      <div
        className="border-primary pointer-events-none fixed inset-0 z-[9999] border-4"
        aria-hidden="true"
      />

      {/* Sudo mode badge */}
      <div className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-[9999] flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-lg">
        <ShieldAlert className="h-4 w-4" />
        <span>Sudo Mode Active</span>
      </div>
    </>
  );
}
