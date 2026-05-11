import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/server";
import { getAltByHandle } from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { formatDisplayUsername } from "@trainers/utils";
import { AltTournamentHistory } from "./alt-tournament-history";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface AltPageProps {
  params: Promise<{
    handle: string;
  }>;
}

// ============================================================================
// Data fetching
// ============================================================================

const getCachedAlt = (handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getAltByHandle(supabase, handle);
    },
    [`alt-profile-${handle}`],
    { tags: [CacheTags.player(handle)] }
  )();

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: AltPageProps): Promise<Metadata> {
  const { handle } = await params;
  const alt = await getCachedAlt(handle);

  if (!alt) {
    return { title: "Player Not Found" };
  }

  const displayName = formatDisplayUsername(alt.username);

  return {
    title: `${displayName} - Tournament History`,
    description: `${displayName}'s tournament history on trainers.gg`,
    robots: { index: false, follow: false },
  };
}

// ============================================================================
// Page
// ============================================================================

export default async function AltPage({ params }: AltPageProps) {
  const { handle } = await params;
  const alt = await getCachedAlt(handle);

  if (!alt) {
    notFound();
  }

  const displayName = formatDisplayUsername(alt.username);
  const initials = alt.username.slice(0, 2).toUpperCase();

  return (
    <PageContainer>
      {/* Compact banner */}
      <div className="relative">
        <div className="h-28 w-full overflow-hidden rounded-xl sm:h-36">
          <div className="from-muted/80 via-muted/40 to-muted/20 h-full w-full bg-gradient-to-br" />
        </div>

        {/* Avatar */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Avatar
            noBorder
            className="ring-background h-20 w-20 shadow-lg ring-4 sm:h-24 sm:w-24"
          >
            <AvatarImage
              src={alt.avatar_url ?? undefined}
              alt={`${displayName} avatar`}
            />
            <AvatarFallback className="bg-muted text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Header */}
      <div className="mt-10 sm:mt-12">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="h-3 w-3" />
            Private Alt
          </Badge>
        </div>

        {alt.bio && (
          <p className="text-muted-foreground mt-2 max-w-2xl whitespace-pre-wrap">
            {alt.bio}
          </p>
        )}
      </div>

      {/* Tournament history */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Tournament History</h2>
        <AltTournamentHistory altId={alt.id} handle={handle} />
      </div>
    </PageContainer>
  );
}
