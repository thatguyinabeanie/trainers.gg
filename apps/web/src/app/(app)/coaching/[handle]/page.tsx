import { notFound } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Settings } from "lucide-react";

import { getCoachProfileByHandle } from "@trainers/supabase";

import { createClientReadOnly, getUserId } from "@/lib/supabase/server";
import {
  checkFeatureAccess,
  isCoachingPublic,
} from "@/lib/feature-flags/check-flag";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  live: "Live Session",
  replay_review: "Replay Review",
  team_review: "Team Review",
  mentorship: "Mentorship",
};

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function CoachProfilePage({ params }: Props) {
  const { handle } = await params;
  const userId = await getUserId();
  const allowed = userId
    ? await checkFeatureAccess("coaching", userId)
    : await isCoachingPublic();
  if (!allowed) notFound();

  const supabase = await createClientReadOnly();
  const profile = await getCoachProfileByHandle(supabase, handle);
  if (!profile) notFound();

  const isOwner = userId != null && userId === profile.userId;
  const initials = profile.displayName.slice(0, 2).toUpperCase();

  return (
    <PageContainer>
      {/* Gradient banner matching the player profile pattern */}
      <div className="relative">
        <div className="h-40 w-full overflow-hidden rounded-xl sm:h-48 md:h-56">
          <div className="from-primary/20 via-primary/10 to-muted h-full w-full bg-gradient-to-br" />
        </div>

        {/* Avatar overlaps the bottom of the banner */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Avatar
            noBorder
            className="ring-background h-24 w-24 shadow-lg ring-4 sm:h-28 sm:w-28"
          >
            <AvatarImage
              src={profile.avatarUrl ?? undefined}
              alt={`${profile.displayName} avatar`}
            />
            <AvatarFallback className="bg-muted text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Header — offset below avatar */}
      <div className="mt-10 sm:mt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">
                {profile.displayName}
              </h1>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
                <GraduationCap className="h-3 w-3" />
                Coach
              </Badge>
            </div>

            <p className="text-muted-foreground text-lg">@{profile.handle}</p>

            {profile.headline && (
              <p className="text-muted-foreground max-w-2xl text-base font-medium">
                {profile.headline}
              </p>
            )}

            {profile.bio && (
              <p className="text-muted-foreground max-w-2xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
          </div>

          {isOwner && (
            <div className="shrink-0">
              <Link href="/dashboard/coaching">
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Formats chips */}
        {profile.formats.length > 0 && (
          <div className="mt-5">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              Formats
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.formats.map((format) => (
                <Badge key={format} variant="secondary">
                  {format}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Service types chips */}
        {profile.serviceTypes.length > 0 && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              Services
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.serviceTypes.map((service) => (
                <Badge key={service} variant="outline">
                  {SERVICE_TYPE_LABELS[service] ?? service}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {profile.links.length > 0 && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              Links
            </p>
            <ul className="flex flex-col gap-1">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
