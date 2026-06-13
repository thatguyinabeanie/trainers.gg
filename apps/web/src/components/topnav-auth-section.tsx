"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";

import { type listMyCommunities } from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";
import { type ActionResult } from "@trainers/validators";

import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleSudoMode, checkSudoStatus } from "@/lib/sudo/actions";
import { toast } from "sonner";

export function TopNavAuthSection() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  /** Shape of a single community from `listMyCommunities`. */
  type MyCommunity = Awaited<ReturnType<typeof listMyCommunities>>[number];

  /**
   * Fetch the caller's community list from the auth-gated `/api/v1/me/communities`
   * route (built in T3j). Replaces the browser `useSupabaseQuery(listMyCommunities)`
   * read that would break once S-bucket SELECT grants are revoked.
   */
  async function fetchMyCommunities(): Promise<ActionResult<MyCommunity[]>> {
    return fetch("/api/v1/me/communities").then((r) => r.json());
  }

  // Only query when the user is authenticated so we don't issue an immediate
  // 401 on first render before the session resolves.
  const { data: myOrganizations } = useApiQuery<MyCommunity[]>(
    ["me", "communities"],
    fetchMyCommunities,
    { staleTime: 30_000, enabled: !!user }
  );

  // Sudo mode state
  const [sudoStatus, setSudoStatus] = useState<{
    isActive: boolean;
    isSiteAdmin: boolean;
  }>({ isActive: false, isSiteAdmin: false });
  const [sudoLoading, setSudoLoading] = useState(false);

  // Check sudo status on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSudoStatus().then(setSudoStatus);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleToggleSudo = async () => {
    setSudoLoading(true);
    try {
      const result = await toggleSudoMode();
      if (result.success) {
        setSudoStatus({
          isActive: result.isActive,
          isSiteAdmin: sudoStatus.isSiteAdmin,
        });
        if (result.isActive) {
          toast.success("Sudo mode activated", {
            description: "You now have elevated admin permissions.",
          });
        } else {
          toast.success("Sudo mode deactivated", {
            description: "Admin permissions have been revoked.",
          });
        }
        // Refresh the page to update admin route access
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Error", {
        description: "Failed to toggle sudo mode",
      });
    } finally {
      setSudoLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="hidden h-4 w-20 lg:block" />
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
        <DropdownMenuTrigger
          aria-label="User menu"
          className="hover:bg-accent focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-transparent px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground hidden max-w-32 truncate text-sm lg:inline">
            {displayName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="px-1.5 py-1.5">
            <p className="text-sm leading-none font-medium">{displayName}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          {user.user_metadata?.username && (
            <DropdownMenuItem>
              <Link
                href={`/@${user.user_metadata.username}`}
                className="flex items-center gap-1.5"
              >
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
          )}

          {/* My Organizations Section - Only show if user has orgs */}
          {hasOrganizations && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  My Communities
                </DropdownMenuLabel>
                {myOrganizations.map((community) => (
                  <DropdownMenuItem
                    key={community.id}
                    className="justify-between"
                  >
                    <Link
                      href={`/dashboard/community/${community.slug}`}
                      className="flex flex-1 items-center justify-between gap-1.5"
                    >
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="truncate">{community.name}</span>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}

          {/* Sudo Mode Toggle - Only for site admins */}
          {sudoStatus.isSiteAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleToggleSudo}
                disabled={sudoLoading}
                className={sudoStatus.isActive ? "bg-primary/10" : ""}
              >
                {sudoStatus.isActive ? (
                  <ShieldAlert className="text-primary mr-2 h-4 w-4" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                <span className="flex-1">
                  Sudo Mode {sudoStatus.isActive ? "(Active)" : "(Inactive)"}
                </span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
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
