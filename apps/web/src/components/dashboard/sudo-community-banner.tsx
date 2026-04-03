"use client";

import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface SudoCommunityBannerProps {
  communityName: string;
}

export function SudoCommunityBanner({ communityName }: SudoCommunityBannerProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-50 w-full border-b border-amber-200 bg-amber-50 px-4 py-2"
      )}
    >
      <div className="flex items-center gap-2 text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">
          Viewing {communityName} via sudo mode — read-only access
        </span>
      </div>
    </div>
  );
}
