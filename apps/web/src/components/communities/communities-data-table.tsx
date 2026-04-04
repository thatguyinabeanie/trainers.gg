"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { type CommunityWithCounts } from "@trainers/supabase";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Trophy } from "lucide-react";

function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTierBadge(tier: string | null) {
  if (!tier || tier === "standard") return null;

  const tierLabel = tier === "partner" ? "Partner" : "Verified";
  return (
    <Badge variant="secondary" className="text-xs">
      {tierLabel}
    </Badge>
  );
}

export const communitiesColumns: ColumnDef<CommunityWithCounts>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const community = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar noBorder className="h-8 w-8">
            <AvatarImage
              src={community.logo_url ?? undefined}
              alt={community.name}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {community.icon ? (
                <span className="text-base">{community.icon}</span>
              ) : (
                getCommunityInitials(community.name)
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <Link
              href={`/communities/${community.slug}`}
              className="hover:text-primary font-medium hover:underline"
            >
              {community.name}
            </Link>
            {getTierBadge(community.tier)}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const community = row.original;
      return (
        <span className="text-muted-foreground max-w-md truncate">
          {community.description || `@${community.slug}`}
        </span>
      );
    },
  },
  {
    accessorKey: "activeTournamentsCount",
    header: ({ column }) => (
      <div className="flex items-center justify-end gap-1">
        <SortableHeader column={column}>
          <Trophy className="mr-1 h-3.5 w-3.5" />
          Active Tournaments
        </SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground text-right">
        {row.original.activeTournamentsCount || 0}
      </div>
    ),
  },
  {
    accessorKey: "totalTournamentsCount",
    header: ({ column }) => (
      <div className="flex items-center justify-end gap-1">
        <SortableHeader column={column}>
          <Trophy className="mr-1 h-3.5 w-3.5" />
          Total Tournaments
        </SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground text-right">
        {row.original.totalTournamentsCount || 0}
      </div>
    ),
  },
];

interface CommunitiesDataTableProps {
  data: CommunityWithCounts[];
}

export function CommunitiesDataTable({ data }: CommunitiesDataTableProps) {
  return (
    <div className="space-y-4">
      {/* Desktop: DataTable */}
      <div className="hidden md:block">
        <DataTable columns={communitiesColumns} data={data} />
      </div>

      {/* Mobile: Card list */}
      <div className="divide-y rounded-lg border md:hidden">
        {data.length > 0 ? (
          data.map((community) => {
            const activeCount = community.activeTournamentsCount || 0;
            const totalCount = community.totalTournamentsCount || 0;

            return (
              <Link
                key={community.id}
                href={`/communities/${community.slug}`}
                className="hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors"
              >
                <Avatar noBorder className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={community.logo_url ?? undefined}
                    alt={community.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {community.icon ? (
                      <span className="text-lg">{community.icon}</span>
                    ) : (
                      getCommunityInitials(community.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="truncate font-semibold">{community.name}</p>
                    {getTierBadge(community.tier)}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {community.description || `@${community.slug}`}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    <Trophy className="inline h-3 w-3" /> {activeCount} active ·{" "}
                    {totalCount} total
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center">
              No communities found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
