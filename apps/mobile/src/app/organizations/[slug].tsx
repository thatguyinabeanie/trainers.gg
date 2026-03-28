import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ActivityIndicator, Linking } from "react-native";
import { useState } from "react";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Badge } from "@/components/ui";
import { useCommunity } from "@/lib/supabase";
import {
  communitySocialLinksSchema,
  type CommunitySocialLink,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { socialPlatformLabels } from "@trainers/utils";

/** Map platform to Ionicons icon name. */
const PLATFORM_ICONS: Record<SocialLinkPlatform, string> = {
  discord: "logo-discord",
  twitter: "logo-twitter",
  youtube: "logo-youtube",
  twitch: "logo-twitch",
  tiktok: "logo-tiktok",
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  reddit: "logo-reddit",
  github: "logo-github",
  bluesky: "globe-outline",
  threads: "globe-outline",
  mastodon: "globe-outline",
  linkedin: "logo-linkedin",
  patreon: "heart-outline",
  kofi: "cafe-outline",
  website: "globe-outline",
  custom: "link-outline",
};

function parseSocialLinks(raw: unknown): CommunitySocialLink[] {
  const result = communitySocialLinksSchema.safeParse(raw);
  return result.success ? result.data : [];
}

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { community, loading, error, refetch } = useCommunity(slug);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <Screen>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={String(theme.primary.get())} />
        </YStack>
      </Screen>
    );
  }

  if (error || !community) {
    return (
      <Screen>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$6"
          gap="$3"
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={String(theme.destructive.get())}
          />
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$color"
            textAlign="center"
          >
            Community not found
          </Text>
          <Text fontSize="$3" color="$mutedForeground" textAlign="center">
            The community you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </Text>
        </YStack>
      </Screen>
    );
  }

  const tierBadge =
    community.tier === "verified" || community.tier === "partner"
      ? community.tier
      : null;

  return (
    <Screen>
      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={String(theme.primary.get())}
          />
        }
      >
        {/* Header */}
        <YStack padding="$5" gap="$4">
          <XStack alignItems="center" gap="$4">
            {/* Org Icon */}
            <YStack
              width={72}
              height={72}
              alignItems="center"
              justifyContent="center"
              borderRadius="$4"
              backgroundColor="$muted"
            >
              <Ionicons
                name="business"
                size={36}
                color={String(theme.mutedForeground.get())}
              />
            </YStack>

            {/* Org Name & Badges */}
            <YStack flex={1} gap="$1">
              <XStack alignItems="center" gap="$2" flexWrap="wrap">
                <Text fontSize="$7" fontWeight="700" color="$color">
                  {community.name}
                </Text>
                {tierBadge && (
                  <Badge
                    variant={tierBadge === "partner" ? "default" : "secondary"}
                  >
                    {tierBadge === "partner" ? "Partner" : "Verified"}
                  </Badge>
                )}
              </XStack>
              <Text fontSize="$3" color="$mutedForeground">
                @{community.slug}
              </Text>
            </YStack>
          </XStack>

          {/* Description */}
          {community.description && (
            <Text fontSize="$4" color="$color" lineHeight="$5">
              {community.description}
            </Text>
          )}

          {/* Stats Row */}
          <XStack gap="$6" marginTop="$2">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$primary">
                {community.stats.totalTournamentsCount}
              </Text>
              <Text fontSize="$2" color="$mutedForeground">
                Tournaments
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$color">
                {community.followerCount}
              </Text>
              <Text fontSize="$2" color="$mutedForeground">
                Staff
              </Text>
            </YStack>
            {community.stats.primaryFormat && (
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$color">
                  {community.stats.primaryFormat}
                </Text>
                <Text fontSize="$2" color="$mutedForeground">
                  Primary Format
                </Text>
              </YStack>
            )}
          </XStack>

          {/* Social Links */}
          {(() => {
            const socialLinks = parseSocialLinks(community.social_links);
            if (socialLinks.length === 0) return null;
            return (
              <XStack gap="$4" marginTop="$2" flexWrap="wrap">
                {socialLinks.map((link, i) => (
                  <XStack
                    key={`${link.platform}-${i}`}
                    alignItems="center"
                    gap="$1"
                    onPress={() => Linking.openURL(link.url)}
                    accessible={true}
                    accessibilityRole="link"
                    accessibilityLabel={
                      link.label || socialPlatformLabels[link.platform]
                    }
                  >
                    <Ionicons
                      name={
                        PLATFORM_ICONS[
                          link.platform
                        ] as keyof typeof Ionicons.glyphMap
                      }
                      size={16}
                      color={String(theme.primary.get())}
                    />
                    <Text fontSize="$3" color="$primary">
                      {link.label || socialPlatformLabels[link.platform]}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            );
          })()}
        </YStack>

        {/* Active Tournaments */}
        {community.tournaments.active.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$4" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Active Tournaments
            </Text>
            {community.tournaments.active.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                isLive
              />
            ))}
          </YStack>
        )}

        {/* Upcoming Tournaments */}
        {community.tournaments.upcoming.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$6" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Upcoming Tournaments
            </Text>
            {community.tournaments.upcoming.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </YStack>
        )}

        {/* Completed Tournaments */}
        {community.tournaments.completed.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$6" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Past Tournaments
            </Text>
            {community.tournaments.completed.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </YStack>
        )}

        {/* Empty State */}
        {community.tournaments.active.length === 0 &&
          community.tournaments.upcoming.length === 0 &&
          community.tournaments.completed.length === 0 && (
            <YStack
              marginHorizontal="$5"
              marginTop="$6"
              backgroundColor="$card"
              borderRadius="$4"
              padding="$6"
              alignItems="center"
              gap="$3"
            >
              <Ionicons
                name="trophy-outline"
                size={48}
                color={String(theme.mutedForeground.get())}
              />
              <Text
                fontSize="$5"
                fontWeight="600"
                color="$color"
                textAlign="center"
              >
                No tournaments yet
              </Text>
              <Text fontSize="$3" color="$mutedForeground" textAlign="center">
                This community hasn&apos;t hosted any tournaments.
              </Text>
            </YStack>
          )}
      </ScrollView>
    </Screen>
  );
}

interface TournamentData {
  id: number;
  name: string;
  format: string | null;
  start_date: string | null;
  registrationCount: number;
}

function TournamentCard({
  tournament,
  isLive = false,
}: {
  tournament: TournamentData;
  isLive?: boolean;
}) {
  return (
    <YStack
      backgroundColor="$card"
      borderRadius="$4"
      padding="$4"
      pressStyle={{ opacity: 0.8 }}
    >
      <XStack alignItems="flex-start" justifyContent="space-between">
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            {isLive && <Badge variant="destructive">LIVE</Badge>}
            {tournament.format && (
              <Badge variant="secondary">{tournament.format}</Badge>
            )}
          </XStack>
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$cardForeground"
            marginTop="$1"
          >
            {tournament.name}
          </Text>
          {tournament.start_date && (
            <Text fontSize="$3" color="$mutedForeground">
              {new Date(tournament.start_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          )}
        </YStack>
        <YStack alignItems="flex-end">
          <Text fontSize="$5" fontWeight="700" color="$primary">
            {tournament.registrationCount}
          </Text>
          <Text fontSize="$2" color="$mutedForeground">
            registered
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}
