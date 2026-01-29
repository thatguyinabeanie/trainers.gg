import { Alert, Platform } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { useAuth, getUserDisplayName, useSiteRoles } from "@/lib/supabase";
import { Screen, Avatar, Badge, Button, ListItem } from "@/components/ui";

const MOCK_STATS = {
  tournaments: 12,
  wins: 3,
  teams: 8,
};

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();

  return (
    <YStack
      flex={1}
      alignItems="center"
      paddingVertical="$4"
      backgroundColor="$backgroundStrong"
      borderRadius="$4"
    >
      <YStack
        marginBottom="$2"
        height={40}
        width={40}
        alignItems="center"
        justifyContent="center"
        borderRadius="$full"
        backgroundColor="$primary"
        opacity={0.15}
      >
        <Ionicons name={icon} size={20} color={theme.primary.val} />
      </YStack>
      <Text fontSize="$7" fontWeight="700" color="$color">
        {value}
      </Text>
      <Text fontSize="$2" color="$mutedForeground" marginTop="$1">
        {label}
      </Text>
    </YStack>
  );
}

export default function ProfileScreen() {
  const { user, loading, isAuthenticated, linkBluesky } = useAuth();
  const { siteRoles } = useSiteRoles();
  const theme = useTheme();

  if (loading) {
    return <Screen loading />;
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="$6"
          gap="$4"
        >
          <YStack
            height={96}
            width={96}
            alignItems="center"
            justifyContent="center"
            borderRadius="$full"
            backgroundColor="$backgroundStrong"
          >
            <Ionicons
              name="person-outline"
              size={48}
              color={theme.mutedForeground.val}
            />
          </YStack>

          <YStack alignItems="center" gap="$2">
            <Text fontSize="$7" fontWeight="600" color="$color">
              Sign in to your account
            </Text>
            <Text
              textAlign="center"
              color="$mutedForeground"
              paddingHorizontal="$4"
            >
              View your profile, track tournaments, and manage your teams.
            </Text>
          </YStack>

          <YStack width="100%" maxWidth={320} gap="$3" marginTop="$4">
            <Link href="/(auth)/sign-in" asChild>
              <Button width="100%">Sign In</Button>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Button variant="outline" width="100%">
                Create Account
              </Button>
            </Link>
          </YStack>
        </YStack>
      </Screen>
    );
  }

  const displayName = getUserDisplayName(user);
  const username = user?.user_metadata?.username as string | undefined;
  const blueskyHandle = user?.user_metadata?.bluesky_handle as
    | string
    | undefined;
  const did = user?.user_metadata?.did as string | undefined;

  const handleLinkBluesky = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Link Bluesky",
        "Enter your Bluesky handle (e.g., username.bsky.social)",
        async (handle) => {
          if (handle?.trim()) {
            const { error } = await linkBluesky(handle.trim());
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("Success", "Bluesky account linked!");
            }
          }
        },
        "plain-text"
      );
    } else {
      // Alert.prompt is iOS-only; show a basic alert on Android
      Alert.alert(
        "Link Bluesky",
        "To link your Bluesky account, use the web app or sign in with Bluesky from the sign-in screen."
      );
    }
  };

  return (
    <Screen>
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Header */}
        <YStack paddingHorizontal="$4" paddingVertical="$6" gap="$6">
          <YStack alignItems="center" gap="$3">
            <Avatar size="xl" fallback={displayName} />
            <YStack alignItems="center" gap="$1">
              <Text fontSize="$7" fontWeight="700" color="$color">
                {displayName}
              </Text>
              {username && (
                <Text color="$mutedForeground" fontSize="$4">
                  @{username}
                </Text>
              )}
            </YStack>
            {siteRoles.length > 0 && (
              <XStack flexWrap="wrap" justifyContent="center" gap="$2">
                {siteRoles.map((role) => (
                  <Badge key={role} variant="default">
                    {role}
                  </Badge>
                ))}
              </XStack>
            )}
          </YStack>

          {/* Stats Row */}
          <XStack gap="$3">
            <StatItem
              label="Tournaments"
              value={MOCK_STATS.tournaments}
              icon="trophy-outline"
            />
            <StatItem
              label="Wins"
              value={MOCK_STATS.wins}
              icon="medal-outline"
            />
            <StatItem
              label="Teams"
              value={MOCK_STATS.teams}
              icon="layers-outline"
            />
          </XStack>
        </YStack>

        {/* Profile Actions */}
        <YStack paddingHorizontal="$4" gap="$6">
          <YStack
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
            overflow="hidden"
          >
            <ListItem
              title="Edit Profile"
              subtitle="Update your name, bio, and avatar"
              icon="person-outline"
            />
            <ListItem
              title="My Teams"
              subtitle="View and manage your team builds"
              icon="layers-outline"
              rightText={`${MOCK_STATS.teams}`}
            />
            <ListItem
              title="Tournament History"
              subtitle="View your past tournament results"
              icon="trophy-outline"
              rightText={`${MOCK_STATS.tournaments}`}
            />
          </YStack>

          {/* Connections Section */}
          <YStack gap="$3">
            <Text
              fontSize="$2"
              fontWeight="500"
              color="$mutedForeground"
              textTransform="uppercase"
              letterSpacing={0.5}
              paddingHorizontal="$4"
            >
              Connections
            </Text>
            <YStack
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              overflow="hidden"
            >
              <ListItem
                title="Bluesky"
                subtitle={
                  did
                    ? `Connected as @${blueskyHandle || "linked"}`
                    : "Connect your Bluesky account"
                }
                icon="at-outline"
                iconColor={theme.primary.val}
                rightText={did ? "Connected" : "Connect"}
                onPress={did ? undefined : handleLinkBluesky}
              />
              <ListItem
                title="Pokemon Showdown"
                subtitle="Link your Showdown username"
                icon="game-controller-outline"
              />
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
