"use client";

import { useCallback } from "react";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut,
  Settings,
  UserCircle,
  LayoutDashboard,
  Building2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { useSupabaseQuery } from "@/lib/supabase";
import { listMyOrganizations } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";

export function TopNavAuthSection() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const userId = user?.id;

  const myOrganizationsQueryFn = useCallback(
    (client: TypedSupabaseClient) =>
      userId ? listMyOrganizations(client, userId) : Promise.resolve([]),
    [userId]
  );

  const { data: myOrganizations } = useSupabaseQuery(myOrganizationsQueryFn, [
    userId,
  ]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
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
        <ThemeSwitcher />
        <Link href="/sign-in">
          <button className="hover:bg-accent rounded-md px-3 py-1.5 text-sm font-medium">
            Sign In
          </button>
        </Link>
        <Link href="/sign-up">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium">
            Sign Up
          </button>
        </Link>
      </div>
    );
  }

  // Get display info using shared helper
  const displayName = getUserDisplayName(user);
  const avatarUrl =
    user.profile?.avatarUrl ??
    (user.user_metadata?.avatar_url as string | undefined);
  const userInitial = displayName.charAt(0).toUpperCase();

  const hasOrganizations = myOrganizations && myOrganizations.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Notification Bell */}
      <NotificationBell userId={user.id} />

      {/* Theme Switcher */}

      <ThemeSwitcher />

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-accent focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-transparent px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
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
            <p className="text-sm leading-none font-medium">{displayName}</p>
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

          {/* My Organizations Section - Only show if user has orgs */}
          {hasOrganizations && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                My Organizations
              </DropdownMenuLabel>
              {myOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => router.push(`/to-dashboard/${org.slug}`)}
                  className="justify-between"
                >
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                </DropdownMenuItem>
              ))}
            </>
          )}

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
