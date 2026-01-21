"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { Bell, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TopNavAuthSection() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-end gap-4">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button size="sm">Sign Up</Button>
        </Link>
      </div>
    );
  }

  const displayName =
    user.fullName ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress ||
    "Trainer";
  const avatarUrl = user.imageUrl;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-end gap-4">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-xs">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {displayName}
        </span>
      </div>
      <Button variant="ghost" size="icon" className="size-9">
        <Bell className="size-4" />
      </Button>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" className="size-9">
          <Settings className="size-4" />
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button size="sm" variant="outline" className="hidden sm:inline-flex">
          Dashboard
        </Button>
      </Link>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => signOut({ redirectUrl: "/" })}
      >
        Sign Out
      </Button>
    </div>
  );
}
