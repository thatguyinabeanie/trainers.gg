"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  LayoutDashboard,
  Trophy,
  UserCog,
  Plus,
  ArrowLeft,
  Circle,
  MoreVertical,
  LogOut,
  Settings,
  User,
  ChevronsUpDown,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

interface AltInfo {
  id: number;
  username: string;
  avatarUrl: string | null;
  isMain: boolean;
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
  alts: AltInfo[];
  communities: CommunityInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCommunitySlug(pathname: string): string | null {
  const match = /^\/dashboard\/community\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * Derives which alt username is selected from the URL path.
 * Returns null when on /dashboard/alts (all alts view) or non-alts pages.
 */
function getSelectedAltUsername(pathname: string): string | null {
  const match = /^\/dashboard\/alts\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

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
  alts,
  communities,
  ...props
}: DashboardSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const communitySlug = getCommunitySlug(pathname);
  const isCommunityContext = communitySlug !== null;

  const activeCommunity = isCommunityContext
    ? (communities.find((c) => c.slug === communitySlug) ?? null)
    : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header — alt switcher */}
      <SidebarHeader>
        <AltSwitcher alts={alts} />
      </SidebarHeader>

      {/* Content — context-switches between player and community nav */}
      <SidebarContent>
        {isCommunityContext && activeCommunity ? (
          <CommunityNav community={activeCommunity} pathname={pathname} />
        ) : (
          <PlayerNav pathname={pathname} communities={communities} />
        )}
      </SidebarContent>

      {/* Footer — NavUser with dropdown */}
      <SidebarFooter>
        <NavUser
          user={user}
          activeCommunity={
            isCommunityContext && activeCommunity ? activeCommunity : null
          }
        />
      </SidebarFooter>
    </Sidebar>
  );
}

// ---------------------------------------------------------------------------
// AltSwitcher — header component replacing the logo, popover pattern
// ---------------------------------------------------------------------------

interface AltSwitcherProps {
  alts: AltInfo[];
}

function AltAvatar({
  alt,
  size = "sm",
}: {
  alt: Pick<AltInfo, "username" | "avatarUrl">;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "size-7" : "size-8";
  const textClass = size === "sm" ? "text-[11px]" : "text-sm";

  if (alt.avatarUrl) {
    return (
      <Image
        src={alt.avatarUrl}
        alt={alt.username}
        width={size === "sm" ? 28 : 32}
        height={size === "sm" ? 28 : 32}
        className={cn(
          sizeClass,
          "shrink-0 rounded-full border border-teal-200 object-cover"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        textClass,
        "flex shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 font-semibold text-teal-700"
      )}
      aria-hidden
    >
      {alt.username.charAt(0).toUpperCase()}
    </div>
  );
}

function AltSwitcher({ alts }: AltSwitcherProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  const selectedUsername = getSelectedAltUsername(pathname);

  // Resolve which alt to show in the trigger:
  // 1. If on an alt-specific URL, show that alt
  // 2. Otherwise, show the main alt (or first alt as fallback)
  const mainAlt = alts.find((a) => a.isMain) ?? alts[0] ?? null;
  const selectedAlt = selectedUsername
    ? (alts.find((a) => a.username === selectedUsername) ?? mainAlt)
    : mainAlt;

  // Subtitle: when on /dashboard/alts (all alts page), show "All alts"
  const isAllAltsPage = pathname === "/dashboard/alts";

  const triggerSubtitle = isAllAltsPage
    ? "All alts"
    : selectedAlt?.isMain
      ? "Main alt"
      : "Alt";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                tooltip="Switch alt"
              />
            }
          >
            {selectedAlt ? (
              <AltAvatar alt={selectedAlt} size="sm" />
            ) : (
              // Collapsed icon fallback when no alts exist
              <div className="bg-primary text-primary-foreground flex aspect-square size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                t
              </div>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {selectedAlt?.username ?? "No alts"}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {triggerSubtitle}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[260px] rounded-xl p-0"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            {/* Header label */}
            <div className="text-muted-foreground px-3.5 py-2.5 text-[10px] font-medium tracking-wide uppercase">
              Switch alt
            </div>

            {/* All Alts option */}
            <DropdownMenuItem
              render={<Link href="/dashboard/alts" />}
              className="mx-1 gap-2.5 rounded-lg px-3 py-2"
            >
              <div className="text-muted-foreground bg-muted flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs">
                ✦
              </div>
              <span className="font-medium">All Alts</span>
            </DropdownMenuItem>

            {alts.length > 0 && <DropdownMenuSeparator className="mx-3.5" />}

            {/* Alt list */}
            {alts.map((alt) => {
              const isSelected = selectedAlt?.id === alt.id && !isAllAltsPage;
              return (
                <DropdownMenuItem
                  key={alt.id}
                  render={<Link href={`/dashboard/alts/${alt.username}`} />}
                  className={cn(
                    "mx-1 gap-2.5 rounded-lg px-3 py-2",
                    isSelected && "bg-accent"
                  )}
                >
                  <AltAvatar alt={alt} size="sm" />
                  <span className="flex-1 font-medium">{alt.username}</span>
                  {alt.isMain && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-800">
                      Main
                    </span>
                  )}
                  {isSelected && (
                    <Check className="size-3.5 shrink-0 text-teal-600" />
                  )}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator className="mx-3.5" />

            {/* Actions */}
            <DropdownMenuItem
              render={
                <Link href="/dashboard/alts/new" aria-label="Create new alt" />
              }
              className="mx-1 gap-2.5 rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground flex size-[26px] shrink-0 items-center justify-center text-base">
                +
              </span>
              <span>Create new alt</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              render={<Link href="/dashboard/alts" />}
              className="mx-1 mb-1 gap-2.5 rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground flex size-[26px] shrink-0 items-center justify-center text-base">
                ⚙
              </span>
              <span>Manage alts</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ---------------------------------------------------------------------------
// NavUser — shadcn dashboard-01 pattern with 3-dot menu
// ---------------------------------------------------------------------------

interface NavUserProps {
  user: UserInfo;
  activeCommunity: CommunityInfo | null;
}

function NavUser({ user, activeCommunity }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-full">
              <AvatarImage
                src={user.avatarUrl ?? undefined}
                alt={user.username}
              />
              <AvatarFallback className="rounded-full">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.username}</span>
              <span className="text-muted-foreground truncate text-xs">
                {activeCommunity
                  ? `${activeCommunity.role.charAt(0).toUpperCase()}${activeCommunity.role.slice(1)}`
                  : "Player"}
              </span>
            </div>
            <MoreVertical className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-full">
                <AvatarImage
                  src={user.avatarUrl ?? undefined}
                  alt={user.username}
                />
                <AvatarFallback className="rounded-full">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.username}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {activeCommunity
                    ? `${activeCommunity.role.charAt(0).toUpperCase()}${activeCommunity.role.slice(1)}`
                    : "Player"}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link
                href="/dashboard/settings"
                className="flex w-full items-center gap-2"
              >
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href="/dashboard/settings/account"
                className="flex w-full items-center gap-2"
              >
                <User className="size-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ---------------------------------------------------------------------------
// Player nav — no Settings item (Settings is in user dropdown only)
// ---------------------------------------------------------------------------

interface PlayerNavProps {
  pathname: string;
  communities: CommunityInfo[];
}

function PlayerNav({ pathname, communities }: PlayerNavProps) {
  const playerItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Alts",
      href: "/dashboard/alts",
      icon: Users,
      isActive: pathname.startsWith("/dashboard/alts"),
    },
    {
      label: "Tournaments",
      href: "/dashboard/tournaments",
      icon: Trophy,
      isActive: pathname.startsWith("/dashboard/tournaments"),
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
                  tooltip={item.label}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Communities section */}
      {communities.length > 0 && (
        <>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
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

      {/* Secondary nav — pinned to bottom of SidebarContent */}
      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard/settings" />}
                isActive={pathname.startsWith("/dashboard/settings")}
                tooltip="Settings"
              >
                <Settings className="size-4 shrink-0" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

// ---------------------------------------------------------------------------
// Community nav — back button uses the logo area pattern
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
      {/* Back to dashboard */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard" />}
                tooltip="Back to Dashboard"
                className="text-muted-foreground"
              >
                <ArrowLeft className="size-4 shrink-0" />
                <span>Back to Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Community header */}
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
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

      {/* Community nav items */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {communityItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={item.isActive}
                  tooltip={item.label}
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
                  tooltip={settingsItem.label}
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
// Community icon
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
      {community.name.charAt(0).toUpperCase()}
    </div>
  );
}
