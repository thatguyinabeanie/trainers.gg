"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface BlueskyAvatarProps {
  src?: string;
  alt?: string;
  displayName?: string;
  handle?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

/**
 * Avatar component for Bluesky users.
 * Shows the user's avatar image with a fallback to initials.
 */
export function BlueskyAvatar({
  src,
  alt,
  displayName,
  handle,
  size = "default",
  className,
}: BlueskyAvatarProps) {
  // Generate initials from display name or handle
  const initials = getInitials(displayName, handle);
  const altText = alt || displayName || handle || "User avatar";

  return (
    <Avatar size={size} className={cn(className)}>
      {src && <AvatarImage src={src} alt={altText} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Get initials from display name or handle.
 * - For display name: First letter of first two words
 * - For handle: First two characters
 */
function getInitials(displayName?: string, handle?: string): string {
  if (displayName) {
    const words = displayName.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }

  if (handle) {
    // Remove @ if present and get first two chars
    const cleanHandle = handle.replace(/^@/, "");
    return cleanHandle.slice(0, 2).toUpperCase();
  }

  return "??";
}
