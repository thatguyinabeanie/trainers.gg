import { useState, useCallback } from "react";
import { RefreshControl, Pressable } from "react-native";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Avatar } from "@/components/ui";
import { useAuth } from "@/lib/supabase";
import { useDrawer } from "@/components/navigation";

// Mock data - will be replaced with real data from database
const MOCK_POSTS = [
  {
    id: "1",
    author: {
      username: "WolfeyVGC",
      displayName: "Wolfe Glick",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Just hit #1 on ladder with a spicy new team! Full breakdown coming soon. The meta is shifting and I think people are sleeping on some really strong options right now.",
    createdAt: "2h",
    stats: { likes: 1234, replies: 89, reposts: 156, views: 45200 },
    liked: false,
    reposted: false,
  },
  {
    id: "2",
    author: {
      username: "CybertronVGC",
      displayName: "Aaron Zheng",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Tournament prep stream starting in 30 minutes! Come hang out and theory craft for Orlando Regionals. Giving away some codes too!",
    createdAt: "4h",
    stats: { likes: 567, replies: 34, reposts: 45, views: 12300 },
    liked: true,
    reposted: false,
  },
  {
    id: "3",
    author: {
      username: "pokemon_trainer_42",
      displayName: "Alex Chen",
      avatarUrl: null,
      verified: false,
    },
    content:
      "First time making it to Day 2 at a regional! Still can't believe it. Thank you to everyone who helped me prep. This community is amazing.",
    createdAt: "6h",
    stats: { likes: 892, replies: 67, reposts: 23, views: 8900 },
    liked: false,
    reposted: false,
  },
  {
    id: "4",
    author: {
      username: "VGC_Analytics",
      displayName: "VGC Analytics",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Usage stats from last weekend's regionals are now live! Some surprising trends:\n\n• Flutter Mane usage up 8%\n• Incineroar still king at 67%\n• New tech: Maushold seeing play\n\nFull breakdown on our site.",
    createdAt: "8h",
    stats: { likes: 2341, replies: 156, reposts: 432, views: 89000 },
    liked: false,
    reposted: true,
  },
  {
    id: "5",
    author: {
      username: "JamesB_Pokemon",
      displayName: "James Baek",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Hot take: the best players aren't the ones with the best teams, they're the ones who understand their teams the deepest. You can win with almost anything if you know every interaction.",
    createdAt: "12h",
    stats: { likes: 3456, replies: 234, reposts: 567, views: 120000 },
    liked: true,
    reposted: false,
  },
  {
    id: "7",
    author: {
      username: "pokemon_professor",
      displayName: "Professor Pokemon",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Reminder: Registration for NAIC closes next Friday! Make sure you have your Player ID ready and hotel booked. It's going to be a massive event this year.",
    createdAt: "14h",
    stats: { likes: 1823, replies: 145, reposts: 289, views: 67000 },
    liked: false,
    reposted: false,
  },
  {
    id: "8",
    author: {
      username: "VGC_Memes",
      displayName: "VGC Memes",
      avatarUrl: null,
      verified: false,
    },
    content:
      "POV: You're about to win game 3 and your opponent reveals Tera Fairy on their Amoonguss",
    createdAt: "16h",
    stats: { likes: 4521, replies: 312, reposts: 823, views: 156000 },
    liked: true,
    reposted: true,
  },
  {
    id: "9",
    author: {
      username: "TeamBuildingTips",
      displayName: "Team Building Tips",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Thread: How to build a consistent tournament team\n\n1. Start with a proven core\n2. Identify your win conditions\n3. Cover common threats\n4. Test against the top 10 Pokemon\n5. Have a plan for Trick Room\n\nMore details below...",
    createdAt: "18h",
    stats: { likes: 2876, replies: 198, reposts: 654, views: 98000 },
    liked: false,
    reposted: false,
  },
  {
    id: "10",
    author: {
      username: "RegionalChamp2024",
      displayName: "Sarah Miller",
      avatarUrl: null,
      verified: false,
    },
    content:
      "Just won my first Regional! I can't stop shaking. Huge thanks to my testing group - you all believed in me when I didn't believe in myself. Next stop: Worlds qualification!",
    createdAt: "20h",
    stats: { likes: 5678, replies: 432, reposts: 234, views: 145000 },
    liked: false,
    reposted: false,
  },
  {
    id: "11",
    author: {
      username: "MetaMonitor",
      displayName: "Meta Monitor",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Top 5 most common leads this week:\n\n1. Flutter Mane + Fake Out user (34%)\n2. Torkoal + Lilligant (22%)\n3. Chi-Yu + Arcanine (18%)\n4. Iron Hands + Amoonguss (15%)\n5. Palafin + Support (11%)",
    createdAt: "22h",
    stats: { likes: 3234, replies: 187, reposts: 567, views: 112000 },
    liked: true,
    reposted: false,
  },
  {
    id: "12",
    author: {
      username: "RentalTeams",
      displayName: "Rental Teams",
      avatarUrl: null,
      verified: true,
    },
    content:
      "New rental code alert! This Flutter Mane + Dondozo team just got Top 8 at Liverpool Regionals. Perfect for ladder grinding this weekend.\n\nCode: 8X7K-2M4N-9P3L",
    createdAt: "1d",
    stats: { likes: 4123, replies: 234, reposts: 789, views: 178000 },
    liked: false,
    reposted: true,
  },
  {
    id: "13",
    author: {
      username: "TCG_Crossover",
      displayName: "TCG & VGC Player",
      avatarUrl: null,
      verified: false,
    },
    content:
      "Anyone else playing both TCG and VGC this season? Managing two different metas is exhausting but I love both formats too much to choose!",
    createdAt: "1d",
    stats: { likes: 876, replies: 123, reposts: 45, views: 34000 },
    liked: false,
    reposted: false,
  },
  {
    id: "14",
    author: {
      username: "CompetitiveCoach",
      displayName: "VGC Coach",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Coaching session slots for January are now open! Whether you're prepping for your first local or grinding for Worlds, I can help you level up. DM for rates.",
    createdAt: "1d",
    stats: { likes: 567, replies: 89, reposts: 123, views: 23000 },
    liked: false,
    reposted: false,
  },
  {
    id: "15",
    author: {
      username: "TournamentOrganizer",
      displayName: "Local TO",
      avatarUrl: null,
      verified: false,
    },
    content:
      "Reminder: Our monthly MSS is this Saturday at 11am! 32 player cap, best of 3 swiss into top cut. Prizing includes CP and store credit. Sign up link in bio!",
    createdAt: "1d",
    stats: { likes: 234, replies: 45, reposts: 67, views: 8900 },
    liked: true,
    reposted: false,
  },
  {
    id: "16",
    author: {
      username: "StreamerVGC",
      displayName: "VGC Streamer",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Going live in 10 minutes with some high ladder games! Currently at 1850 trying to push for that sweet top 100 finish. Come hang out and backseat my plays!",
    createdAt: "2d",
    stats: { likes: 892, replies: 67, reposts: 45, views: 28000 },
    liked: false,
    reposted: false,
  },
];

const MOCK_FOR_YOU_POSTS = [
  {
    id: "6",
    author: {
      username: "trainers_gg",
      displayName: "trainers.gg",
      avatarUrl: null,
      verified: true,
    },
    content:
      "Welcome to trainers.gg! We're building the best platform for competitive Pokemon players. Follow your favorite trainers, track tournaments, and share your journey.\n\n🏆 Tournaments\n📊 Analytics\n👥 Community",
    createdAt: "1d",
    stats: { likes: 5678, replies: 234, reposts: 890, views: 250000 },
    liked: false,
    reposted: false,
  },
  ...MOCK_POSTS,
];

type FeedTab = "following" | "forYou";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

interface PostData {
  id: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
  };
  content: string;
  createdAt: string;
  stats: {
    likes: number;
    replies: number;
    reposts: number;
    views: number;
  };
  liked: boolean;
  reposted: boolean;
}

function FeedPost({ post }: { post: PostData }) {
  const theme = useTheme();
  const [liked, setLiked] = useState(post.liked);
  const [reposted, setReposted] = useState(post.reposted);

  return (
    <Pressable>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$3"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        {/* Avatar */}
        <Avatar size="md" fallback={post.author.displayName} />

        {/* Content */}
        <YStack flex={1} gap="$1">
          {/* Author Row */}
          <XStack alignItems="center" gap="$1.5" flexWrap="wrap">
            <Text fontSize="$4" fontWeight="600" color="$color">
              {post.author.displayName}
            </Text>
            {post.author.verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={String(theme.primary.get())}
              />
            )}
            <Text fontSize="$3" color="$mutedForeground">
              @{post.author.username}
            </Text>
            <Text fontSize="$3" color="$mutedForeground">
              · {post.createdAt}
            </Text>
          </XStack>

          {/* Post Content */}
          <Text fontSize="$4" color="$color" lineHeight="$5">
            {post.content}
          </Text>

          {/* Engagement Row */}
          <XStack
            marginTop="$2"
            justifyContent="space-between"
            paddingRight="$8"
          >
            {/* Reply */}
            <Pressable>
              <XStack alignItems="center" gap="$1.5">
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={String(theme.mutedForeground.get())}
                />
                <Text fontSize="$2" color="$mutedForeground">
                  {formatNumber(post.stats.replies)}
                </Text>
              </XStack>
            </Pressable>

            {/* Repost */}
            <Pressable onPress={() => setReposted(!reposted)}>
              <XStack alignItems="center" gap="$1.5">
                <Ionicons
                  name="repeat"
                  size={18}
                  color={
                    reposted ? "#00ba7c" : String(theme.mutedForeground.get())
                  }
                />
                <Text
                  fontSize="$2"
                  color={reposted ? "#00ba7c" : "$mutedForeground"}
                >
                  {formatNumber(
                    post.stats.reposts + (reposted && !post.reposted ? 1 : 0)
                  )}
                </Text>
              </XStack>
            </Pressable>

            {/* Like */}
            <Pressable onPress={() => setLiked(!liked)}>
              <XStack alignItems="center" gap="$1.5">
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={18}
                  color={
                    liked ? "#f91880" : String(theme.mutedForeground.get())
                  }
                />
                <Text
                  fontSize="$2"
                  color={liked ? "#f91880" : "$mutedForeground"}
                >
                  {formatNumber(
                    post.stats.likes + (liked && !post.liked ? 1 : 0)
                  )}
                </Text>
              </XStack>
            </Pressable>

            {/* Views */}
            <XStack alignItems="center" gap="$1.5">
              <Ionicons
                name="stats-chart-outline"
                size={16}
                color={String(theme.mutedForeground.get())}
              />
              <Text fontSize="$2" color="$mutedForeground">
                {formatNumber(post.stats.views)}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </Pressable>
  );
}

function FeedTabSwitcher({
  activeTab,
  onTabChange,
}: {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}) {
  return (
    <XStack
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Pressable style={{ flex: 1 }} onPress={() => onTabChange("forYou")}>
        <YStack alignItems="center" paddingVertical="$3.5">
          <Text
            fontSize="$4"
            fontWeight={activeTab === "forYou" ? "700" : "500"}
            color={activeTab === "forYou" ? "$color" : "$mutedForeground"}
          >
            For You
          </Text>
          {activeTab === "forYou" && (
            <YStack
              position="absolute"
              bottom={0}
              width={60}
              height={3}
              borderRadius={2}
              backgroundColor="$primary"
            />
          )}
        </YStack>
      </Pressable>

      <Pressable style={{ flex: 1 }} onPress={() => onTabChange("following")}>
        <YStack alignItems="center" paddingVertical="$3.5">
          <Text
            fontSize="$4"
            fontWeight={activeTab === "following" ? "700" : "500"}
            color={activeTab === "following" ? "$color" : "$mutedForeground"}
          >
            Following
          </Text>
          {activeTab === "following" && (
            <YStack
              position="absolute"
              bottom={0}
              width={70}
              height={3}
              borderRadius={2}
              backgroundColor="$primary"
            />
          )}
        </YStack>
      </Pressable>
    </XStack>
  );
}

function ComposeButton() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <Pressable
      style={{
        position: "absolute",
        right: 20,
        bottom: insets.bottom + 80,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#1b9388",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}

function UnauthenticatedBanner() {
  return (
    <YStack
      paddingHorizontal="$4"
      paddingVertical="$5"
      backgroundColor="$card"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      gap="$3"
    >
      <Text fontSize="$5" fontWeight="700" color="$color">
        Welcome to trainers.gg
      </Text>
      <Text fontSize="$3" color="$mutedForeground" lineHeight="$4">
        Join the competitive Pokemon community. Follow trainers, share your
        journey, and stay updated on tournaments.
      </Text>
      <XStack gap="$3">
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "#1b9388",
              paddingVertical: 12,
              borderRadius: 20,
              alignItems: "center",
            }}
          >
            <Text color="white" fontWeight="600" fontSize="$3">
              Create Account
            </Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#1b9388",
              paddingVertical: 12,
              borderRadius: 20,
              alignItems: "center",
            }}
          >
            <Text color="$primary" fontWeight="600" fontSize="$3">
              Sign In
            </Text>
          </Pressable>
        </Link>
      </XStack>
    </YStack>
  );
}

function HomeHeader() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { openDrawer } = useDrawer();
  const { user, isAuthenticated } = useAuth();

  return (
    <YStack backgroundColor="$background">
      {/* Safe area spacer - accounts for Dynamic Island/notch */}
      <YStack height={insets.top} />

      {/* Header content */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        height={44}
        alignItems="center"
        justifyContent="center"
      >
        {/* Left: Avatar / Menu */}
        <Pressable
          onPress={openDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ position: "absolute", left: 16 }}
        >
          {isAuthenticated ? (
            <Avatar size="sm" fallback={user?.email || "U"} />
          ) : (
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="$muted"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons
                name="menu"
                size={20}
                color={String(theme.color.get())}
              />
            </YStack>
          )}
        </Pressable>

        {/* Center: Logo */}
        <Text fontSize="$5" fontWeight="700" color="$primary">
          trainers.gg
        </Text>
      </XStack>
    </YStack>
  );
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const posts = activeTab === "following" ? MOCK_POSTS : MOCK_FOR_YOU_POSTS;

  return (
    <Screen>
      {/* Custom Header with Avatar */}
      <HomeHeader />

      {/* Feed Tab Switcher */}
      <FeedTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={String(theme.primary.get())}
          />
        }
      >
        {/* Unauthenticated Banner */}
        {!isAuthenticated && <UnauthenticatedBanner />}

        {/* Feed */}
        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}

        {/* End of feed indicator */}
        <YStack paddingVertical="$8" alignItems="center">
          <Text fontSize="$3" color="$mutedForeground">
            You&apos;re all caught up!
          </Text>
        </YStack>
      </ScrollView>

      {/* Floating Compose Button */}
      <ComposeButton />
    </Screen>
  );
}
