import { useState } from "react";
import { RefreshControl, ActivityIndicator } from "react-native";
import { YStack, XStack, Text, ScrollView, Input, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Screen, Avatar, Badge } from "@/components/ui";
import { useOrganizations, type OrganizationWithCounts } from "@/lib/supabase";

// Mock data for trending content
const TRENDING_TEAMS = [
  {
    id: "1",
    name: "Aurora Veil HO",
    format: "VGC 2026",
    pokemon: [
      "Miraidon",
      "Koraidon",
      "Flutter Mane",
      "Iron Hands",
      "Amoonguss",
      "Incineroar",
    ],
    usage: "12.4%",
    trend: "up",
  },
  {
    id: "2",
    name: "Sun Room",
    format: "VGC 2026",
    pokemon: [
      "Groudon",
      "Venusaur",
      "Charizard",
      "Torkoal",
      "Cresselia",
      "Landorus",
    ],
    usage: "8.7%",
    trend: "up",
  },
  {
    id: "3",
    name: "Psyspam",
    format: "VGC 2026",
    pokemon: [
      "Calyrex-Shadow",
      "Indeedee-F",
      "Zacian",
      "Whimsicott",
      "Gastrodon",
      "Incineroar",
    ],
    usage: "7.2%",
    trend: "down",
  },
];

const TOP_TRAINERS = [
  { id: "1", name: "WolfeyVGC", points: 2450, rank: 1 },
  { id: "2", name: "CybertronVGC", points: 2380, rank: 2 },
  { id: "3", name: "AaronZheng", points: 2320, rank: 3 },
  { id: "4", name: "JamesB", points: 2290, rank: 4 },
  { id: "5", name: "Eduardo", points: 2250, rank: 5 },
];

const CATEGORIES = [
  { id: "teams", label: "Teams", icon: "layers-outline" as const },
  { id: "trainers", label: "Trainers", icon: "people-outline" as const },
  { id: "organizations", label: "Orgs", icon: "business-outline" as const },
  { id: "tournaments", label: "Events", icon: "trophy-outline" as const },
  { id: "analysis", label: "Analysis", icon: "analytics-outline" as const },
];

function CategoryPill({
  category,
  isActive,
  onPress,
}: {
  category: (typeof CATEGORIES)[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <XStack
      alignItems="center"
      gap="$2"
      paddingHorizontal="$4"
      paddingVertical="$2.5"
      borderRadius="$10"
      backgroundColor={isActive ? "$primary" : "$card"}
      pressStyle={{ opacity: 0.8 }}
      onPress={onPress}
    >
      <Ionicons
        name={category.icon}
        size={18}
        color={
          isActive
            ? theme.background.get()
            : String(theme.mutedForeground.get())
        }
      />
      <Text
        fontSize="$3"
        fontWeight="500"
        color={isActive ? "$background" : "$mutedForeground"}
      >
        {category.label}
      </Text>
    </XStack>
  );
}

function TeamCard({ team }: { team: (typeof TRENDING_TEAMS)[0] }) {
  const theme = useTheme();

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
            <Text fontSize="$5" fontWeight="600" color="$cardForeground">
              {team.name}
            </Text>
            <Badge variant="secondary">{team.format}</Badge>
          </XStack>
          <Text fontSize="$3" color="$mutedForeground">
            {team.pokemon.slice(0, 3).join(" • ")}
          </Text>
          <Text fontSize="$2" color="$mutedForeground">
            +{team.pokemon.length - 3} more
          </Text>
        </YStack>
        <YStack alignItems="flex-end" gap="$1">
          <XStack alignItems="center" gap="$1">
            <Ionicons
              name={team.trend === "up" ? "trending-up" : "trending-down"}
              size={16}
              color={
                team.trend === "up"
                  ? String(theme.primary.get())
                  : String(theme.destructive.get())
              }
            />
            <Text fontSize="$4" fontWeight="600" color="$cardForeground">
              {team.usage}
            </Text>
          </XStack>
          <Text fontSize="$2" color="$mutedForeground">
            usage
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function TrainerRow({
  trainer,
  isLast: _isLast,
}: {
  trainer: (typeof TOP_TRAINERS)[0];
  isLast: boolean;
}) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$3"
      pressStyle={{ opacity: 0.7 }}
    >
      <Text
        width={32}
        textAlign="center"
        fontWeight="700"
        fontSize="$4"
        color="$mutedForeground"
      >
        {trainer.rank}
      </Text>
      <Avatar size="sm" fallback={trainer.name} />
      <Text
        flex={1}
        marginLeft="$3"
        fontSize="$4"
        fontWeight="500"
        color="$color"
      >
        {trainer.name}
      </Text>
      <XStack alignItems="baseline" gap="$1">
        <Text fontSize="$4" fontWeight="600" color="$primary">
          {trainer.points}
        </Text>
        <Text fontSize="$2" color="$mutedForeground">
          pts
        </Text>
      </XStack>
    </XStack>
  );
}

function OrganizationCard({ org }: { org: OrganizationWithCounts }) {
  const theme = useTheme();
  const tierBadge =
    org.tier === "verified" || org.tier === "partner" ? org.tier : null;

  return (
    <Link href={`/organizations/${org.slug}` as never} asChild>
      <YStack
        backgroundColor="$card"
        borderRadius="$4"
        padding="$4"
        pressStyle={{ opacity: 0.8 }}
      >
        <XStack alignItems="center" gap="$3">
          {/* Org Icon/Logo */}
          <YStack
            width={48}
            height={48}
            alignItems="center"
            justifyContent="center"
            borderRadius="$3"
            backgroundColor="$muted"
          >
            <Ionicons
              name="business"
              size={24}
              color={String(theme.mutedForeground.get())}
            />
          </YStack>

          {/* Org Info */}
          <YStack flex={1} gap="$1">
            <XStack alignItems="center" gap="$2">
              <Text
                fontSize="$5"
                fontWeight="600"
                color="$cardForeground"
                numberOfLines={1}
              >
                {org.name}
              </Text>
              {tierBadge && (
                <Badge
                  variant={tierBadge === "partner" ? "default" : "secondary"}
                >
                  {tierBadge === "partner" ? "Partner" : "Verified"}
                </Badge>
              )}
            </XStack>
            {org.description && (
              <Text fontSize="$3" color="$mutedForeground" numberOfLines={2}>
                {org.description}
              </Text>
            )}
          </YStack>

          {/* Stats */}
          <YStack alignItems="flex-end" gap="$0.5">
            <XStack alignItems="center" gap="$1">
              <Ionicons
                name="trophy-outline"
                size={14}
                color={String(theme.primary.get())}
              />
              <Text fontSize="$3" fontWeight="600" color="$primary">
                {org.activeTournamentsCount}
              </Text>
            </XStack>
            <Text fontSize="$1" color="$mutedForeground">
              active events
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Link>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between">
      <Text fontSize="$6" fontWeight="600" color="$color">
        {title}
      </Text>
      {actionLabel && (
        <Text
          fontSize="$3"
          fontWeight="500"
          color="$primary"
          pressStyle={{ opacity: 0.7 }}
          onPress={onAction}
        >
          {actionLabel}
        </Text>
      )}
    </XStack>
  );
}

function OrganizationsContent() {
  const { organizations, loading, error } = useOrganizations();
  const theme = useTheme();

  if (loading) {
    return (
      <YStack padding="$8" alignItems="center">
        <ActivityIndicator size="large" color={String(theme.primary.get())} />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack padding="$6" alignItems="center" gap="$2">
        <Ionicons
          name="alert-circle-outline"
          size={32}
          color={String(theme.destructive.get())}
        />
        <Text color="$destructive" textAlign="center">
          Failed to load organizations
        </Text>
      </YStack>
    );
  }

  if (organizations.length === 0) {
    return (
      <YStack
        backgroundColor="$card"
        borderRadius="$4"
        padding="$6"
        alignItems="center"
        gap="$3"
      >
        <Ionicons
          name="business-outline"
          size={48}
          color={String(theme.mutedForeground.get())}
        />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          No organizations yet
        </Text>
        <Text
          fontSize="$3"
          color="$mutedForeground"
          textAlign="center"
          lineHeight="$3"
        >
          Organizations host tournaments and build communities.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$3">
      {organizations.map((org) => (
        <OrganizationCard key={org.id} org={org} />
      ))}
    </YStack>
  );
}

function TeamsAndTrainersContent() {
  return (
    <>
      {/* Trending Teams */}
      <YStack marginTop="$5" paddingHorizontal="$4" gap="$3">
        <SectionHeader title="Trending Teams" actionLabel="View All" />
        <YStack gap="$3">
          {TRENDING_TEAMS.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </YStack>
      </YStack>

      {/* Top Trainers */}
      <YStack marginTop="$6" paddingHorizontal="$4" gap="$3">
        <SectionHeader title="Top Trainers" actionLabel="Leaderboard" />
        <YStack
          backgroundColor="$card"
          borderRadius="$4"
          paddingHorizontal="$3"
        >
          {TOP_TRAINERS.map((trainer, index) => (
            <TrainerRow
              key={trainer.id}
              trainer={trainer}
              isLast={index === TOP_TRAINERS.length - 1}
            />
          ))}
        </YStack>
      </YStack>
    </>
  );
}

export default function ExploreScreen() {
  const [activeCategory, setActiveCategory] = useState("teams");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useTheme();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

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
        {/* Search Bar */}
        <YStack
          marginHorizontal="$4"
          marginTop="$4"
          marginBottom="$4"
          backgroundColor="$card"
          borderRadius="$4"
          paddingHorizontal="$3"
        >
          <XStack alignItems="center" gap="$2">
            <Ionicons
              name="search"
              size={20}
              color={String(theme.mutedForeground.get())}
            />
            <Input
              flex={1}
              placeholder="Search teams, trainers, orgs..."
              placeholderTextColor="$mutedForeground"
              value={searchQuery}
              onChangeText={setSearchQuery}
              backgroundColor="transparent"
              borderWidth={0}
              paddingHorizontal="$0"
              paddingVertical="$3"
              fontSize="$4"
              color="$color"
            />
          </XStack>
        </YStack>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((category) => (
            <CategoryPill
              key={category.id}
              category={category}
              isActive={activeCategory === category.id}
              onPress={() => setActiveCategory(category.id)}
            />
          ))}
        </ScrollView>

        {/* Content based on active category */}
        {activeCategory === "organizations" ? (
          <YStack marginTop="$5" paddingHorizontal="$4" gap="$3">
            <SectionHeader title="Organizations" />
            <OrganizationsContent />
          </YStack>
        ) : (
          <TeamsAndTrainersContent />
        )}
      </ScrollView>
    </Screen>
  );
}
