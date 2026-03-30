"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Inbox,
  History,
  Settings,
  LayoutDashboard,
  Trophy,
  UserCog,
  Plus,
  ChevronLeft,
  Circle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

interface CommunityInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: "owner" | "staff";
  hasLiveTournament: boolean;
}

interface DashboardSidebarProps {
  user: UserInfo;
  communities: CommunityInfo[];
  unreadInboxCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the community slug when the path is under /dashboard/community/[slug] */
function getCommunitySlug(pathname: string): string | null {
  const match = /^\/dashboard\/community\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

/** First letter used as a fallback icon for a community */
function communityInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Emerald dot indicating a live tournament is happening in this community */
function LiveDot() {
  return (
    <Circle className="ml-auto size-2 shrink-0 fill-emerald-500 text-emerald-500" />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardSidebar({
  user,
  communities,
  unreadInboxCount,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const communitySlug = getCommunitySlug(pathname);
  const isCommunityContext = communitySlug !== null;

  // Find the active community object when in community context
  const activeCommunity = isCommunityContext
    ? (communities.find((c) => c.slug === communitySlug) ?? null)
    : null;

  return (
    <Sidebar collapsible="none">
      {/* ------------------------------------------------------------------ */}
      {/* Header — logo + back link                                           */}
      {/* ------------------------------------------------------------------ */}
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            href="/"
            className="text-foreground text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            trainers.gg
          </Link>

          {/* Back link */}
          {isCommunityContext ? (
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <ChevronLeft className="size-3" />
              Dashboard
            </Link>
          ) : (
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <ChevronLeft className="size-3" />
              Back to site
            </Link>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ------------------------------------------------------------------ */}
      {/* Content — context-switches between player and community nav         */}
      {/* ------------------------------------------------------------------ */}
      <SidebarContent>
        {isCommunityContext && activeCommunity ? (
          <CommunityNav community={activeCommunity} pathname={pathname} />
        ) : (
          <PlayerNav
            pathname={pathname}
            communities={communities}
            unreadInboxCount={unreadInboxCount}
          />
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* ------------------------------------------------------------------ */}
      {/* Footer — user info                                                  */}
      {/* ------------------------------------------------------------------ */}
      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard/settings" />}
              size="lg"
              isActive={pathname === "/dashboard/settings"}
              className="gap-3"
            >
              <Avatar size="sm">
                <AvatarImage
                  src={user.avatarUrl ?? undefined}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {user.username}
                </span>
                {isCommunityContext && activeCommunity ? (
                  <span className="text-muted-foreground truncate text-xs capitalize">
                    {activeCommunity.role}
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Settings className="size-3" />
                    Settings
                  </span>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// ---------------------------------------------------------------------------
// Player nav
// ---------------------------------------------------------------------------

interface PlayerNavProps {
  pathname: string;
  communities: CommunityInfo[];
  unreadInboxCount: number;
}

function PlayerNav({
  pathname,
  communities,
  unreadInboxCount,
}: PlayerNavProps) {
  const playerItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
      // Exact match only — do not highlight for sub-routes
      isActive: pathname === "/dashboard",
    },
    {
      label: "Alts & Teams",
      href: "/dashboard/alts",
      icon: Users,
      isActive: pathname.startsWith("/dashboard/alts"),
    },
    {
      label: "Inbox",
      href: "/dashboard/inbox",
      icon: Inbox,
      isActive: pathname.startsWith("/dashboard/inbox"),
    },
    {
      label: "History",
      href: "/dashboard/history",
      icon: History,
      isActive: pathname.startsWith("/dashboard/history"),
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      isActive: pathname.startsWith("/dashboard/settings"),
    },
  ] as const;

  return (
    <>
      {/* Main nav */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {playerItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={item.isActive}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </SidebarMenuButton>

                {/* Unread badge rendered only for Inbox */}
                {item.label === "Inbox" && unreadInboxCount > 0 && (
                  <SidebarMenuBadge>{unreadInboxCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Communities section — only rendered when user has at least one */}
      {communities.length > 0 && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>
              Communities
              <SidebarGroupAction
                render={
                  <Link
                    href="/dashboard/community/request"
                    aria-label="Request a community"
                  />
                }
              >
                <Plus className="size-3.5" />
              </SidebarGroupAction>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {communities.map((community) => (
                  <SidebarMenuItem key={community.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={`/dashboard/community/${community.slug}`} />
                      }
                      isActive={false}
                      className="gap-2.5"
                    >
                      <CommunityIcon community={community} />
                      <span className="truncate">{community.name}</span>
                      {community.hasLiveTournament && <LiveDot />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Community nav
// ---------------------------------------------------------------------------

interface CommunityNavProps {
  community: CommunityInfo;
  pathname: string;
}

function CommunityNav({ community, pathname }: CommunityNavProps) {
  const base = `/dashboard/community/${community.slug}`;

  const communityItems = [
    {
      label: "Overview",
      href: base,
      icon: LayoutDashboard,
      // Exact match for overview
      isActive: pathname === base,
    },
    {
      label: "Tournaments",
      href: `${base}/tournaments`,
      icon: Trophy,
      isActive: pathname.startsWith(`${base}/tournaments`),
    },
    {
      label: "Staff",
      href: `${base}/staff`,
      icon: UserCog,
      isActive: pathname.startsWith(`${base}/staff`),
    },
  ] as const;

  // Settings is owner-only
  const settingsItem =
    community.role === "owner"
      ? {
          label: "Settings",
          href: `${base}/settings`,
          icon: Settings,
          isActive: pathname.startsWith(`${base}/settings`),
        }
      : null;

  return (
    <>
      {/* Community header */}
      <SidebarGroup>
        <div className="flex items-center gap-3 px-2 py-1">
          <CommunityIcon community={community} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{community.name}</p>
            <p className="text-muted-foreground text-xs capitalize">
              {community.role}
            </p>
          </div>
          {community.hasLiveTournament && <LiveDot />}
        </div>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Community nav items */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {communityItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={item.isActive}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {settingsItem && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={settingsItem.href} />}
                  isActive={settingsItem.isActive}
                >
                  <settingsItem.icon className="size-4 shrink-0" />
                  <span>{settingsItem.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

// ---------------------------------------------------------------------------
// Community icon — logo image or letter fallback
// ---------------------------------------------------------------------------

interface CommunityIconProps {
  community: CommunityInfo;
  size?: "sm" | "md";
}

function CommunityIcon({ community, size = "sm" }: CommunityIconProps) {
  if (community.logoUrl) {
    return (
      <Image
        src={community.logoUrl}
        alt={community.name}
        width={size === "sm" ? 20 : 32}
        height={size === "sm" ? 20 : 32}
        className={cn(
          "shrink-0 rounded-md object-cover",
          size === "sm" ? "size-5" : "size-8"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md font-semibold",
        size === "sm" ? "size-5 text-[10px]" : "size-8 text-sm"
      )}
      aria-hidden
    >
      {communityInitial(community.name)}
    </div>
  );
}
