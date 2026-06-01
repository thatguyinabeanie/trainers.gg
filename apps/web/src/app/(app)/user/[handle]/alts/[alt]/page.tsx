import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/server";
import { getAltByHandle } from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft } from "lucide-react";
import { formatDisplayUsername } from "@trainers/utils";
import { AltTournamentHistory } from "../../../../alts/[handle]/alt-tournament-history";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface AltPageProps {
  params: Promise<{
    handle: string;
    alt: string;
  }>;
}

// ============================================================================
// Data fetching
// ============================================================================

const getCachedAlt = (altHandle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getAltByHandle(supabase, altHandle);
    },
    [`alt-profile-${altHandle}`],
    { tags: [CacheTags.player(altHandle)] }
  )();

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: AltPageProps): Promise<Metadata> {
  const { handle, alt: altHandle } = await params;
  const alt = await getCachedAlt(altHandle);

  if (!alt) {
    return { title: "Alt Not Found" };
  }

  const displayName = formatDisplayUsername(alt.username);
  const parentName = formatDisplayUsername(handle);

  return {
    title: `${displayName} - ${parentName}'s Alt`,
    description: `${displayName}'s tournament history on trainers.gg`,
  };
}

// ============================================================================
// Page
// ============================================================================

export default async function UserAltPage({ params }: AltPageProps) {
  const { handle, alt: altHandle } = await params;
  const alt = await getCachedAlt(altHandle);

  if (!alt) {
    notFound();
  }

  const displayName = formatDisplayUsername(alt.username);
  const parentDisplayName = formatDisplayUsername(handle);
  const initials = alt.username.slice(0, 2).toUpperCase();

  return (
    <PageContainer>
      {/* Back to profile link */}
      <Link
        href={`/@${handle}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {parentDisplayName}&apos;s profile
      </Link>

      {/* Compact banner */}
      <div className="relative">
        <div className="h-28 w-full overflow-hidden rounded-xl sm:h-36">
          <div className="from-primary/10 via-muted/40 to-muted/20 h-full w-full bg-gradient-to-br" />
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
        <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Alt of{" "}
          <Link href={`/@${handle}`} className="text-primary hover:underline">
            @{handle}
          </Link>
        </p>

        {alt.bio && (
          <p className="text-muted-foreground mt-2 max-w-2xl whitespace-pre-wrap">
            {alt.bio}
          </p>
        )}
      </div>

      {/* Tournament history */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Tournament History</h2>
        <AltTournamentHistory altId={alt.id} handle={altHandle} />
      </div>
    </PageContainer>
  );
}
