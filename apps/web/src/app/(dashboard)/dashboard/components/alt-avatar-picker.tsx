"use client";

import { Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { SpritePicker } from "@/components/profile/sprite-picker";
import { cn } from "@/lib/utils";

interface AltAvatarPickerProps {
  altId: number;
  username: string;
  avatarUrl: string | null;
  onAvatarChange: () => void;
  refreshKey: number;
  size?: "sm" | "md";
}

/**
 * Avatar + popover sprite-picker trigger used in both the desktop alts
 * table and the mobile alts cards. The outer `<span>` stops click
 * propagation so the row/card header doesn't toggle when the user opens
 * the picker.
 */
export function AltAvatarPicker({
  altId,
  username,
  avatarUrl,
  onAvatarChange,
  refreshKey,
  size = "sm",
}: AltAvatarPickerProps) {
  const avatarClass = size === "md" ? "size-9" : "size-7";
  const pencilClass = size === "md" ? "size-3" : "size-2.5";
  const fallbackClass =
    size === "md" ? "text-xs font-bold" : "text-[10px] font-bold";

  return (
    <span onClick={(e) => e.stopPropagation()} className="shrink-0">
      <Popover key={`${altId}-${refreshKey}`}>
        <PopoverTrigger
          title="Change avatar"
          className="group/avatar relative shrink-0 cursor-pointer"
        >
          <div className="relative overflow-hidden rounded-full">
            <Avatar className={cn("ring-primary/10 ring-1", avatarClass)}>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
              <AvatarFallback
                className={cn("bg-primary/10 text-primary", fallbackClass)}
              >
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/avatar:bg-black/40">
              <Pencil
                className={cn(
                  "text-white opacity-0 drop-shadow-md transition-opacity group-hover/avatar:opacity-100",
                  pencilClass
                )}
              />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <SpritePicker
            altId={altId}
            currentAvatarUrl={avatarUrl}
            onAvatarChange={onAvatarChange}
          />
        </PopoverContent>
      </Popover>
    </span>
  );
}
