import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import { getPlayerProfileByHandle } from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { getCountryName } from "@trainers/utils";
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

  const displayName = profile.username;
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${displayName}'s player profile on trainers.gg`;

  return {
    title: `${displayName} - Player Profile`,
    description,
    openGraph: {
      title: `${displayName} - Player Profile`,
      description,
      type: "profile",
      ...(profile.avatar_url ? { images: [{ url: profile.avatar_url }] } : {}),
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

type PlayerProfile = NonNullable<
  Awaited<ReturnType<typeof getPlayerProfileByHandle>>
>;

function PlayerHeader({
  profile,
  canEdit,
}: {
  profile: PlayerProfile;
  canEdit: boolean;
}) {
  // Resolve country from the joined user record
  const user = profile.user as { id: string; country: string | null } | null;
  const countryCode = user?.country ?? null;
  const countryName = countryCode ? getCountryName(countryCode) : null;

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {profile.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          {/* Username */}
          <h1 className="text-3xl font-bold">{profile.username}</h1>

          {/* Country */}
          {countryCode && countryName && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <span>{countryCodeToFlag(countryCode)}</span>
              <span>{countryName}</span>
            </p>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-muted-foreground mt-2 max-w-xl whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Edit profile button (only for the profile owner) */}
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

  // Check if the current user owns this profile
  const user = profile.user as { id: string } | null;
  const canEdit = currentUserId != null && user?.id === currentUserId;

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb username={profile.username} />
      <PlayerHeader profile={profile} canEdit={canEdit} />
      <PlayerProfileTabs altId={profile.id} handle={handle} />
    </div>
  );
}
