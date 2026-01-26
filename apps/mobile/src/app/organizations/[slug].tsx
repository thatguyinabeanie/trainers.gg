import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ActivityIndicator } from "react-native";
import { useState, useCallback } from "react";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Badge } from "@/components/ui";
import { useOrganization } from "@/lib/supabase";

export default function OrganizationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { organization, loading, error, refetch } = useOrganization(slug);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (loading && !refreshing) {
    return (
      <Screen>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={String(theme.primary.get())} />
        </YStack>
      </Screen>
    );
  }

  if (error || !organization) {
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
            Organization not found
          </Text>
          <Text fontSize="$3" color="$mutedForeground" textAlign="center">
            The organization you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </Text>
        </YStack>
      </Screen>
    );
  }

  const tierBadge =
    organization.tier === "verified" || organization.tier === "partner"
      ? organization.tier
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
                  {organization.name}
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
                @{organization.slug}
              </Text>
            </YStack>
          </XStack>

          {/* Description */}
          {organization.description && (
            <Text fontSize="$4" color="$color" lineHeight="$5">
              {organization.description}
            </Text>
          )}

          {/* Stats Row */}
          <XStack gap="$6" marginTop="$2">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$primary">
                {organization.stats.totalTournamentsCount}
              </Text>
              <Text fontSize="$2" color="$mutedForeground">
                Tournaments
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$color">
                {organization.followerCount}
              </Text>
              <Text fontSize="$2" color="$mutedForeground">
                Staff
              </Text>
            </YStack>
            {organization.stats.primaryFormat && (
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$color">
                  {organization.stats.primaryFormat}
                </Text>
                <Text fontSize="$2" color="$mutedForeground">
                  Primary Format
                </Text>
              </YStack>
            )}
          </XStack>

          {/* Social Links */}
          {(organization.website_url ||
            organization.discord_url ||
            organization.twitter_url) && (
            <XStack gap="$4" marginTop="$2">
              {organization.website_url && (
                <XStack alignItems="center" gap="$1">
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={String(theme.primary.get())}
                  />
                  <Text fontSize="$3" color="$primary">
                    Website
                  </Text>
                </XStack>
              )}
              {organization.discord_url && (
                <XStack alignItems="center" gap="$1">
                  <Ionicons
                    name="logo-discord"
                    size={16}
                    color={String(theme.primary.get())}
                  />
                  <Text fontSize="$3" color="$primary">
                    Discord
                  </Text>
                </XStack>
              )}
              {organization.twitter_url && (
                <XStack alignItems="center" gap="$1">
                  <Ionicons
                    name="logo-twitter"
                    size={16}
                    color={String(theme.primary.get())}
                  />
                  <Text fontSize="$3" color="$primary">
                    Twitter
                  </Text>
                </XStack>
              )}
            </XStack>
          )}
        </YStack>

        {/* Active Tournaments */}
        {organization.tournaments.active.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$4" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Active Tournaments
            </Text>
            {organization.tournaments.active.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                isLive
              />
            ))}
          </YStack>
        )}

        {/* Upcoming Tournaments */}
        {organization.tournaments.upcoming.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$6" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Upcoming Tournaments
            </Text>
            {organization.tournaments.upcoming.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </YStack>
        )}

        {/* Completed Tournaments */}
        {organization.tournaments.completed.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$6" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Past Tournaments
            </Text>
            {organization.tournaments.completed.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </YStack>
        )}

        {/* Empty State */}
        {organization.tournaments.active.length === 0 &&
          organization.tournaments.upcoming.length === 0 &&
          organization.tournaments.completed.length === 0 && (
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
                This organization hasn&apos;t hosted any tournaments.
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
