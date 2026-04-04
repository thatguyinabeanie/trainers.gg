import Link from "next/link";

import { type Database } from "@trainers/supabase";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];

function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
            <Avatar className="h-[72px] w-[72px] rounded-2xl shadow-sm transition-shadow group-hover:shadow-md">
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
            {community.tier === "partner" && (
              <div className="border-background absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-teal-600">
                <span className="text-[7px] text-white">✦</span>
              </div>
            )}
          </div>
          <span className="text-foreground max-w-[80px] truncate text-xs font-medium">
            {community.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
