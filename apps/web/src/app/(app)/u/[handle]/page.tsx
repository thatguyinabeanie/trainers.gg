import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  getPlayerProfileByHandle,
  getFollowerCount,
  getFollowingCount,
  getPublicDiscordHandle,
} from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Users } from "lucide-react";
import {
  getCountryName,
  formatDisplayUsername,
  isTempUsername,
} from "@trainers/utils";
import { NewTrainerBadge } from "@/components/ui/new-trainer-badge";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { PlayerProfileTabs } from "./player-profile-tabs";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface PlayerPageProps {
  params: Promise<{
    handle: string;
  }>;
}

// ============================================================================
// Data fetching
// ============================================================================

/**
 * Cached player profile fetcher.
 * Uses handle-specific cache tag for granular invalidation.
 */
const getCachedPlayerProfile = (handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getPlayerProfileByHandle(supabase, handle);
    },
    [`player-profile-${handle}`],
    { tags: [CacheTags.player(handle)] }
  )();

/**
 * Cached follow counts fetcher.
 * Uses handle-specific cache tag for granular invalidation.
 */
const getCachedFollowCounts = (userId: string, handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const [followers, following] = await Promise.all([
        getFollowerCount(supabase, userId),
        getFollowingCount(supabase, userId),
      ]);
      return { followers, following };
    },
    [`player-follow-counts-${userId}`],
    { tags: [CacheTags.player(handle)] }
  )();

/**
 * Get current user ID (not cached - user-specific).
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClientReadOnly();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Cached Discord handle fetcher for public profiles.
 * Reads show_discord_publicly from users table and — only when true — fetches
 * the Discord identity via auth.identities (service role via static client).
 * Uses the same cache tag as the profile so toggling the setting invalidates both.
 */
const getCachedDiscordHandle = (userId: string, handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      // Check whether this user has opted in to showing their Discord publicly
      const { data: userRow } = await supabase
        .from("users")
        .select("show_discord_publicly")
        .eq("id", userId)
        .maybeSingle();

      if (!userRow?.show_discord_publicly) return null;

      // Only call auth.identities when the user has opted in — saves a round trip
      return getPublicDiscordHandle(supabase, userId);
    },
    // Handle is part of the key so a handle-change creates a fresh entry
    // whose tag (CacheTags.player(newHandle)) matches future invalidations.
    // Without it, the cached value would live under the userId forever while
    // the stored tag stayed pinned to the original handle.
    ["player-discord-handle", userId, handle],
    { tags: [CacheTags.player(handle)] }
  )();

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getCachedPlayerProfile(handle);

  if (!profile) {
    return { title: "Player Not Found" };
  }

  const rawDisplayName =
    profile.mainAlt?.username ?? profile.username ?? handle;
  const displayName = formatDisplayUsername(rawDisplayName);
  const bio = profile.mainAlt?.bio;
  const description = bio
    ? bio.slice(0, 160)
    : `${displayName}'s player profile on trainers.gg`;

  return {
    title: `${displayName} - Player Profile`,
    description,
    openGraph: {
      title: `${displayName} - Player Profile`,
      description,
      type: "profile",
      ...(profile.mainAlt?.avatar_url
        ? { images: [{ url: profile.mainAlt.avatar_url }] }
        : {}),
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Each letter maps to a regional indicator symbol.
 */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65; // Regional indicator A
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}

// ============================================================================
// Server Components
// ============================================================================

type PlayerProfile = NonNullable<
  Awaited<ReturnType<typeof getPlayerProfileByHandle>>
>;

function Breadcrumb({ username }: { username: string }) {
  return (
    <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
      <Link href="/players" className="hover:underline">
        Players
      </Link>
      <span>/</span>
      <span className="text-foreground">{username}</span>
    </div>
  );
}

function PublicAltChips({
  alts,
  isOwner,
}: {
  alts: PlayerProfile["alts"];
  isOwner: boolean;
}) {
  // For visitors: show only public alts
  // For owners: show all alts with their public status
  const visibleAlts = isOwner ? alts : alts.filter((alt) => alt.is_public);

  if (visibleAlts.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visibleAlts.map((alt) => (
        <Badge key={alt.id} variant="secondary" className="font-mono text-xs">
          @{alt.username}
          {isOwner && !alt.is_public && (
            <span className="text-muted-foreground ml-1">(hidden)</span>
          )}
        </Badge>
      ))}
    </div>
  );
}

function FollowCounts({
  followers,
  following,
}: {
  followers: number;
  following: number;
}) {
  return (
    <div className="mt-2 flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <Users className="text-muted-foreground h-3.5 w-3.5" />
        <span className="font-semibold">{followers}</span>
        <span className="text-muted-foreground">
          {followers === 1 ? "follower" : "followers"}
        </span>
      </div>
      <div>
        <span className="font-semibold">{following}</span>
        <span className="text-muted-foreground ml-1">following</span>
      </div>
    </div>
  );
}

function PlayerHeader({
  profile,
  canEdit,
  followCounts,
  discordHandle,
}: {
  profile: PlayerProfile;
  canEdit: boolean;
  followCounts: { followers: number; following: number };
  discordHandle: string | null;
}) {
  const mainAlt = profile.mainAlt;
  const countryCode = profile.country;
  const countryName = countryCode ? getCountryName(countryCode) : null;

  // Filter out the main alt from the alt chips display
  const otherAlts = profile.alts.filter((a) => a.id !== mainAlt?.id);

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={mainAlt?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {(() => {
              const raw = mainAlt?.username ?? profile.username ?? "?";
              return isTempUsername(raw) ? "NT" : raw.slice(0, 2).toUpperCase();
            })()}
          </AvatarFallback>
        </Avatar>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {formatDisplayUsername(
                mainAlt?.username ?? profile.username ?? ""
              )}
            </h1>
            {isTempUsername(mainAlt?.username ?? profile.username ?? "") && (
              <NewTrainerBadge className="mt-1" />
            )}
          </div>

          {isTempUsername(profile.username ?? "") ? (
            <p className="text-muted-foreground text-sm">@New Trainer</p>
          ) : (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {countryCode && countryName && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <span>{countryCodeToFlag(countryCode)}</span>
                <span>{countryName}</span>
              </span>
            )}
            {discordHandle && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <DiscordIcon className="size-3 text-[#5865F2]" />@
                {discordHandle}
              </span>
            )}
          </div>

          {mainAlt?.bio && (
            <p className="text-muted-foreground mt-2 max-w-xl whitespace-pre-wrap">
              {mainAlt.bio}
            </p>
          )}

          <PublicAltChips alts={otherAlts} isOwner={canEdit} />
          <FollowCounts
            followers={followCounts.followers}
            following={followCounts.following}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {canEdit && (
          <Link href="/dashboard/settings/profile">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { handle } = await params;

  // Fetch profile (cached) and current user ID (not cached) in parallel
  const [profile, currentUserId] = await Promise.all([
    getCachedPlayerProfile(handle),
    getCurrentUserId(),
  ]);

  if (!profile) {
    notFound();
  }

  // Fetch follow counts and Discord handle in parallel (both depend on profile)
  const [followCounts, discordHandle] = await Promise.all([
    getCachedFollowCounts(profile.userId, handle),
    getCachedDiscordHandle(profile.userId, handle),
  ]);

  const canEdit = currentUserId != null && profile.userId === currentUserId;

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb
        username={formatDisplayUsername(
          profile.mainAlt?.username ?? profile.username ?? handle
        )}
      />
      <PlayerHeader
        profile={profile}
        canEdit={canEdit}
        followCounts={followCounts}
        discordHandle={discordHandle}
      />
      <PlayerProfileTabs altIds={profile.altIds} handle={handle} />
    </div>
  );
}
