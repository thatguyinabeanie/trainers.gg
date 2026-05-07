import Link from "next/link";
import Image from "next/image";
import { Users, ChevronRight, Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CommunityInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  hasLiveTournament: boolean;
}

interface CommunityHighlightsProps {
  communities: CommunityInfo[];
}

/**
 * Server-rendered community highlights section.
 * Shows the user's communities with quick links.
 */
export function CommunityHighlights({
  communities,
}: CommunityHighlightsProps) {
  if (communities.length === 0) {
    return (
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <h3 className="text-sm font-semibold">Your Communities</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Users className="text-muted-foreground size-8" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">
            Not part of any communities yet
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Join a community to participate in tournaments
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            render={<Link href="/communities" />}
            nativeButton={false}
          >
            <Plus className="mr-1.5 size-3.5" />
            Browse Communities
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="text-muted-foreground size-4" />
          <h3 className="text-sm font-semibold">Your Communities</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          render={<Link href="/communities" />}
          nativeButton={false}
        >
          Browse
          <ChevronRight className="ml-0.5 size-3" />
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <Link
            key={community.id}
            href={`/dashboard/community/${community.slug}`}
            className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
          >
            {/* Community logo */}
            <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {community.logoUrl ? (
                <Image
                  src={community.logoUrl}
                  alt={community.name}
                  width={36}
                  height={36}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                <Users className="text-muted-foreground size-4" />
              )}
              {/* Live tournament indicator */}
              {community.hasLiveTournament && (
                <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>

            {/* Community name */}
            <div className="min-w-0 flex-1">
              <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                {community.name}
              </p>
              {community.hasLiveTournament && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Trophy className="size-3" />
                  <span>Live tournament</span>
                </div>
              )}
            </div>

            <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
