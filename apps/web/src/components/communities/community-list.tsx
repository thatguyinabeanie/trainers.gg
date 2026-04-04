import { Users } from "lucide-react";

import { type CommunityWithCounts } from "@trainers/supabase";

import { Card } from "@/components/ui/card";
import { CommunityListRow } from "@/components/communities/community-list-row";

interface CommunityListProps {
  communities: CommunityWithCounts[];
  isSearching?: boolean;
}

export function CommunityList({
  communities,
  isSearching = false,
}: CommunityListProps) {
  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-lg font-semibold">No communities found</p>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          {isSearching
            ? "Try adjusting your search query"
            : "Check back later for more communities!"}
        </p>
      </div>
    );
  }

  return (
    <Card>
      {communities.map((community) => (
        <CommunityListRow key={community.id} community={community} />
      ))}
    </Card>
  );
}
