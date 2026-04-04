import Link from "next/link";

import { type Database } from "@trainers/supabase";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCommunityInitials } from "@/components/communities/community-helpers";

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];

interface FeaturedStripProps {
  communities: CommunityRow[];
}

export function FeaturedStrip({ communities }: FeaturedStripProps) {
  if (communities.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-8">
      {communities.map((community) => (
        <Link
          key={community.id}
          href={`/communities/${community.slug}`}
          className="group flex flex-col items-center gap-2"
        >
          <div className="relative">
            <Avatar
              noBorder
              className="h-50 w-50 rounded-2xl shadow-sm transition-shadow group-hover:shadow-md"
            >
              <AvatarImage
                src={community.logo_url ?? undefined}
                alt={community.name}
                className="rounded-2xl"
              />
              <AvatarFallback className="bg-primary/10 text-primary rounded-2xl text-xl font-bold">
                {community.icon ? (
                  <span className="text-2xl">{community.icon}</span>
                ) : (
                  getCommunityInitials(community.name)
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-foreground line-clamp-2 max-w-[112px] text-center text-xs font-medium">
            {community.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
