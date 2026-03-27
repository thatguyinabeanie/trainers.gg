import { Users } from "lucide-react";
import { type OrganizationWithCounts } from "@trainers/supabase";
import { CommunityCard } from "@/components/communities/community-card";

interface CommunityCardGridProps {
  communities: OrganizationWithCounts[];
  isSearching?: boolean;
}

export function CommunityCardGrid({
  communities,
  isSearching = false,
}: CommunityCardGridProps) {
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
}
