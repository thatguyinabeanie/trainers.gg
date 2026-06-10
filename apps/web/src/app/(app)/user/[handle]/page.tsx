import type { Metadata } from "next";
import { cacheTag, cacheLife } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createStaticClient, getUserId } from "@/lib/supabase/server";
import {
  getPlayerProfileByHandle,
  getFollowerCount,
  getFollowingCount,
  getPublicDiscordHandle,
  getCoachBadges,
  type CoachBadgeInfo,
} from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Trophy, Users, Calendar, MapPin } from "lucide-react";
import {
  getCountryName,
  formatDisplayUsername,
  isTempUsername,
} from "@trainers/utils";
import { NewTrainerBadge } from "@/components/ui/new-trainer-badge";
import { CoachBadge } from "@/components/ui/coach-badge";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { PlayerProfileTabs } from "./player-profile-tabs";

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
 * handle is the explicit parameter — it becomes part of the cache key.
 */
async function getCachedPlayerProfile(handle: string) {
  "use cache";
  cacheTag(CacheTags.player(handle));
  cacheLife("max");
  const supabase = createStaticClient();
  return getPlayerProfileByHandle(supabase, handle);
}

/**
 * Cached follow counts fetcher.
 * Uses handle-specific cache tag for granular invalidation.
 * userId and handle are explicit parameters — both become part of the cache key.
 */
async function getCachedFollowCounts(userId: string, handle: string) {
  "use cache";
  cacheTag(CacheTags.player(handle));
  cacheLife("max");
  const supabase = createStaticClient();
  const [followers, following] = await Promise.all([
    getFollowerCount(supabase, userId),
    getFollowingCount(supabase, userId),
  ]);
  return { followers, following };
}

/**
 * Cached Discord handle fetcher for public profiles.
 * Reads show_discord_publicly from users table and — only when true — fetches
 * the Discord identity via auth.identities (service role via static client).
 * Uses the same cache tag as the profile so toggling the setting invalidates both.
 * userId and handle are explicit parameters — both become part of the cache key.
 * The handle ensures a handle-change creates a fresh entry matching the new tag.
 */
async function getCachedDiscordHandle(userId: string, handle: string) {
  "use cache";
  cacheTag(CacheTags.player(handle));
  cacheLife("max");
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
}

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

type PlayerProfile = Extract<
  NonNullable<Awaited<ReturnType<typeof getPlayerProfileByHandle>>>,
  { type: "profile" }
>;

/**
 * Banner area with gradient background.
 * Users don't have custom banners (yet) — uses a subtle teal gradient.
 * Avatar overlaps the bottom-left edge, matching the community page pattern.
 */
function ProfileBanner({ profile }: { profile: PlayerProfile }) {
  const mainAlt = profile.mainAlt;
  const raw = mainAlt?.username ?? profile.username ?? "?";
  const initials = isTempUsername(raw) ? "NT" : raw.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      {/* Gradient banner */}
      <div className="h-40 w-full overflow-hidden rounded-xl sm:h-48 md:h-56">
        <div className="from-primary/20 via-primary/10 to-muted h-full w-full bg-gradient-to-br" />
      </div>

      {/* Avatar — overlaps the bottom of the banner */}
      <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
        <Avatar
          noBorder
          className="ring-background h-24 w-24 shadow-lg ring-4 sm:h-28 sm:w-28"
        >
          <AvatarImage
            src={mainAlt?.avatar_url ?? undefined}
            alt={`${formatDisplayUsername(raw)} avatar`}
          />
          <AvatarFallback className="bg-muted text-3xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

/**
 * Profile header with name, bio, stats pills, and social links.
 * Matches the community header pattern: offset below banner, stats in pills.
 */
function ProfileHeader({
  profile,
  canEdit,
  followCounts,
  discordHandle,
  coachBadge,
}: {
  profile: PlayerProfile;
  canEdit: boolean;
  followCounts: { followers: number; following: number };
  discordHandle: string | null;
  coachBadge: CoachBadgeInfo | null;
}) {
  const mainAlt = profile.mainAlt;
  const countryCode = profile.country;
  const countryName = countryCode ? getCountryName(countryCode) : null;
  const displayName = formatDisplayUsername(
    mainAlt?.username ?? profile.username ?? ""
  );
  const isTemp = isTempUsername(mainAlt?.username ?? profile.username ?? "");

  // Filter out the main alt from the alt chips display
  const otherAlts = profile.alts.filter((a) => a.id !== mainAlt?.id);

  // Member since year
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : null;

  return (
    <div className="mt-10 sm:mt-12">
      {/* Name row with edit button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{displayName}</h1>
            {isTemp && <NewTrainerBadge className="mt-1" />}
            {coachBadge?.showCoachBadge && coachBadge.coachHandle && (
              <CoachBadge handle={coachBadge.coachHandle} className="mt-1" />
            )}
          </div>

          {/* Handle */}
          {isTemp ? (
            <p className="text-muted-foreground text-lg">@New Trainer</p>
          ) : (
            <p className="text-muted-foreground text-lg">@{profile.username}</p>
          )}

          {/* Bio */}
          {mainAlt?.bio && (
            <p className="text-muted-foreground max-w-2xl whitespace-pre-wrap">
              {mainAlt.bio}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="shrink-0">
            <Link href="/dashboard/settings/profile">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats pills */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
          <Users className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">
            {followCounts.followers}{" "}
            {followCounts.followers === 1 ? "Follower" : "Followers"}
          </span>
        </div>
        <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
          <Trophy className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">
            {followCounts.following} Following
          </span>
        </div>
        {countryCode && countryName && (
          <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
            <MapPin className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">
              {countryCodeToFlag(countryCode)} {countryName}
            </span>
          </div>
        )}
        {memberSince && (
          <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
            <Calendar className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">Joined {memberSince}</span>
          </div>
        )}
      </div>

      {/* Social links + alt chips */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {discordHandle && (
          <span className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors">
            <DiscordIcon className="size-4 text-[#5865F2]" />
            <span>@{discordHandle}</span>
          </span>
        )}
        {profile.pdsHandle && (
          <a
            href={`https://bsky.app/profile/${profile.pdsHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.272-.04.407-.063-.14.022-.276.047-.407.063-3.868.59-8.048 2.058-3.967 7.279C7.515 25.67 10.98 20.293 12 17.518c1.02 2.775 4.483 8.152 8.96 3.372 4.08-5.22-.098-6.69-3.966-7.28a11.64 11.64 0 01-.407-.062c.135.022.271.042.407.062 2.67.297 5.568-.627 6.383-3.364C23.622 9.418 24 4.458 24 3.768c0-.69-.139-1.861-.902-2.203-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"
              />
            </svg>
            <span>@{profile.pdsHandle}</span>
          </a>
        )}
      </div>

      {/* Alt chips */}
      {otherAlts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(canEdit ? otherAlts : otherAlts.filter((a) => a.is_public)).map(
            (alt) => (
              <Badge
                key={alt.id}
                variant="secondary"
                className="font-mono text-xs"
              >
                @{alt.username}
                {canEdit && !alt.is_public && (
                  <span className="text-muted-foreground ml-1">(hidden)</span>
                )}
              </Badge>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { handle } = await params;

  // Fetch profile (cached) and current user ID (not cached) in parallel
  const [profileResult, currentUserId] = await Promise.all([
    getCachedPlayerProfile(handle),
    getUserId(),
  ]);

  if (!profileResult) {
    notFound();
  }

  // If the handle resolved to a private alt, redirect to standalone alt page
  if (profileResult.type === "private-alt") {
    redirect(`/alts/${profileResult.altUsername}`);
  }

  const profile = profileResult;

  // Fetch follow counts, Discord handle, and coach badge in parallel (all
  // depend on profile). The coach-badge lookup is NOT cached with the profile:
  // it is gated on the global coaching flag and per-user coach status, neither
  // of which busts CacheTags.player(handle) — caching it would serve stale
  // badges. The query is privacy-safe (booleans + public handle only).
  const mainAltId = profile.mainAlt?.id ?? null;
  const [followCounts, discordHandle, coachBadgeMap] = await Promise.all([
    getCachedFollowCounts(profile.userId, handle),
    getCachedDiscordHandle(profile.userId, handle),
    mainAltId != null
      ? getCoachBadges(createStaticClient(), [mainAltId])
      : Promise.resolve(null),
  ]);

  const coachBadge =
    mainAltId != null ? (coachBadgeMap?.get(mainAltId) ?? null) : null;

  const canEdit = currentUserId != null && profile.userId === currentUserId;

  // Compute alt sets for privacy-aware data display
  const allAltIds = profile.altIds;
  const publicAltIds = profile.alts.filter((a) => a.is_public).map((a) => a.id);
  const altMap = Object.fromEntries(
    profile.alts.map((a) => [a.id, a.username])
  );

  return (
    <PageContainer>
      <ProfileBanner profile={profile} />
      <ProfileHeader
        profile={profile}
        canEdit={canEdit}
        followCounts={followCounts}
        discordHandle={discordHandle}
        coachBadge={coachBadge}
      />
      <div className="mt-6">
        <PlayerProfileTabs
          allAltIds={allAltIds}
          publicAltIds={publicAltIds}
          isOwner={canEdit}
          altMap={altMap}
          handle={handle}
        />
      </div>
    </PageContainer>
  );
}
