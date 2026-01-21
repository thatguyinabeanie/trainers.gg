"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  LogOut,
  Settings,
  Trophy,
  UserCircle,
  Users,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopNavAuthSection() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="hidden h-4 w-20 sm:block" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
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
    user.profile?.displayName || user.name || user.email || "Trainer";
  const userInitial =
    user.profile?.displayName?.charAt(0).toUpperCase() ||
    user.email?.charAt(0).toUpperCase() ||
    "T";

  return (
    <div className="flex items-center gap-2">
      {/* Notification Bell */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notifications</span>
      </Button>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="bg-transparent hover:bg-accent focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
          <Avatar className="h-8 w-8">
            {user.profile?.avatarUrl && (
              <AvatarImage src={user.profile.avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {displayName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="px-1.5 py-1.5">
            <p className="text-sm leading-none font-medium">
              {user.profile?.displayName || user.name}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-none">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/profiles")}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/tournaments")}>
            <Trophy className="mr-2 h-4 w-4" />
            <span>My Tournaments</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/organizations")}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>My Organizations</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")} disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <span className="text-muted-foreground ml-auto text-xs">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
