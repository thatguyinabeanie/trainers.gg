import { RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { useAuth } from "@/lib/supabase";
import { Screen, Avatar, Badge, Button } from "@/components/ui";

// Mock data for demonstration - will be replaced with real data
const MOCK_TOURNAMENTS = [
  {
    id: "1",
    name: "Orlando Regional Championships",
    date: "Feb 15-16, 2026",
    format: "VGC 2026",
    participants: 512,
    status: "upcoming",
  },
  {
    id: "2",
    name: "Pokemon Players Cup",
    date: "Feb 1, 2026",
    format: "VGC 2026",
    participants: 256,
    status: "live",
  },
];

const MOCK_POSTS = [
  {
    id: "1",
    author: "WolfeyVGC",
    content:
      "Just hit #1 on ladder with a spicy new team! Full breakdown coming soon...",
    likes: 234,
    replies: 45,
    timestamp: "2h ago",
  },
  {
    id: "2",
    author: "CybertronVGC",
    content:
      "Tournament prep stream starting in 30 minutes! Come hang out and theory craft for Orlando.",
    likes: 156,
    replies: 23,
    timestamp: "4h ago",
  },
];

function TournamentCard({
  tournament,
}: {
  tournament: (typeof MOCK_TOURNAMENTS)[0];
}) {
  const isLive = tournament.status === "live";

  return (
    <YStack
      marginBottom="$3"
      backgroundColor="$backgroundStrong"
      borderRadius="$4"
      padding="$4"
      pressStyle={{ opacity: 0.8 }}
    >
      <XStack alignItems="flex-start" justifyContent="space-between">
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            {isLive && <Badge variant="destructive">LIVE</Badge>}
            <Badge variant="secondary">{tournament.format}</Badge>
          </XStack>
          <Text fontSize="$5" fontWeight="600" color="$color" marginTop="$2">
            {tournament.name}
          </Text>
          <Text fontSize="$3" color="$mutedForeground">
            {tournament.date}
          </Text>
        </YStack>
        <YStack alignItems="flex-end">
          <Text fontSize="$6" fontWeight="700" color="$primary">
            {tournament.participants}
          </Text>
          <Text fontSize="$2" color="$mutedForeground">
            players
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function PostCard({ post }: { post: (typeof MOCK_POSTS)[0] }) {
  const theme = useTheme();

  return (
    <YStack marginBottom="$4" gap="$3">
      <XStack alignItems="flex-start" gap="$3">
        <Avatar size="md" fallback={post.author} />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$4" fontWeight="600" color="$color">
              {post.author}
            </Text>
            <Text fontSize="$2" color="$mutedForeground">
              {post.timestamp}
            </Text>
          </XStack>
          <Text fontSize="$3" color="$color" lineHeight="$4">
            {post.content}
          </Text>
          <XStack alignItems="center" gap="$5" marginTop="$2">
            <XStack alignItems="center" gap="$1">
              <Ionicons
                name="heart-outline"
                size={18}
                color={String(theme.mutedForeground?.get())}
              />
              <Text fontSize="$2" color="$mutedForeground">
                {post.likes}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={String(theme.mutedForeground?.get())}
              />
              <Text fontSize="$2" color="$mutedForeground">
                {post.replies}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Ionicons
                name="share-outline"
                size={18}
                color={String(theme.mutedForeground?.get())}
              />
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </YStack>
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
    <XStack
      alignItems="center"
      justifyContent="space-between"
      marginBottom="$4"
    >
      <Text fontSize="$7" fontWeight="700" color="$color">
        {title}
      </Text>
      {actionLabel && (
        <Text
          fontSize="$3"
          fontWeight="500"
          color="$primary"
          onPress={onAction}
        >
          {actionLabel}
        </Text>
      )}
    </XStack>
  );
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <Screen>
      <ScrollView
        flex={1}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={String(theme.primary?.get())}
          />
        }
      >
        {/* Welcome Banner for non-authenticated users */}
        {!isAuthenticated && (
          <YStack
            marginBottom="$6"
            backgroundColor="$backgroundStrong"
            borderRadius="$5"
            padding="$5"
          >
            <XStack alignItems="center" gap="$4">
              <YStack
                width={56}
                height={56}
                alignItems="center"
                justifyContent="center"
                borderRadius={28}
                backgroundColor="$primary"
              >
                <Ionicons name="trophy" size={28} color="#FFFFFF" />
              </YStack>
              <YStack flex={1} gap="$1">
                <Text fontSize="$5" fontWeight="700" color="$color">
                  Welcome to trainers.gg
                </Text>
                <Text fontSize="$3" color="$mutedForeground">
                  Join the competitive Pokemon community
                </Text>
              </YStack>
            </XStack>
            <Link href="/(auth)/sign-in" asChild>
              <Button size="lg" style={{ marginTop: 20 }}>
                Get Started
              </Button>
            </Link>
          </YStack>
        )}

        {/* Tournaments Section */}
        <YStack marginBottom="$6">
          <SectionHeader title="Tournaments" actionLabel="See All" />
          {MOCK_TOURNAMENTS.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </YStack>

        {/* Community Feed Section */}
        <YStack>
          <SectionHeader title="Community" actionLabel="See All" />
          {isAuthenticated ? (
            MOCK_POSTS.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <YStack
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              padding="$6"
              alignItems="center"
              gap="$3"
            >
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={String(theme.mutedForeground?.get())}
              />
              <Text
                fontSize="$5"
                fontWeight="600"
                color="$color"
                textAlign="center"
              >
                Join the conversation
              </Text>
              <Text
                fontSize="$3"
                color="$mutedForeground"
                textAlign="center"
                lineHeight="$3"
              >
                Sign in to see posts from trainers and share your own content.
              </Text>
              <Link href="/(auth)/sign-in" asChild>
                <Button variant="outline" size="sm" style={{ marginTop: 8 }}>
                  Sign In
                </Button>
              </Link>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
