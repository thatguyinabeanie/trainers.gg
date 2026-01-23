import { useEffect } from "react";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { YStack, XStack, Text } from "tamagui";
import { useAuth } from "@/lib/supabase";
import { Button } from "@/components/ui";

export default function IndexScreen() {
  const { isAuthenticated, loading } = useAuth();

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [loading, isAuthenticated]);

  // Show nothing while checking auth or redirecting
  if (loading || isAuthenticated) {
    return null;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <StatusBar style="dark" />

      {/* Hero Section */}
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$6"
      >
        {/* Logo */}
        <YStack
          height={100}
          width={100}
          alignItems="center"
          justifyContent="center"
          borderRadius="$8"
          backgroundColor="$primary"
          marginBottom="$8"
        >
          <Ionicons name="trophy" size={52} color="white" />
        </YStack>

        {/* App Name */}
        <Text fontSize={36} fontWeight="800" color="$color" letterSpacing={-1}>
          trainers.gg
        </Text>

        {/* Tagline */}
        <Text
          marginTop="$2"
          fontSize={17}
          color="$mutedForeground"
          textAlign="center"
          maxWidth={260}
        >
          The competitive Pokemon community platform
        </Text>

        {/* Features */}
        <YStack marginTop="$10" width="100%" maxWidth={320} gap="$3">
          <FeatureItem
            icon="trophy-outline"
            text="Track tournaments and results"
          />
          <FeatureItem
            icon="people-outline"
            text="Connect with trainers worldwide"
          />
          <FeatureItem
            icon="layers-outline"
            text="Share and discover team builds"
          />
        </YStack>
      </YStack>

      {/* CTA Section */}
      <YStack paddingHorizontal="$6" paddingBottom="$12" gap="$4">
        <Link href="/(tabs)/home" asChild>
          <Button size="lg">Get Started</Button>
        </Link>

        <Link href="/(auth)/sign-in" asChild>
          <Text
            textAlign="center"
            fontSize={15}
            fontWeight="600"
            color="$mutedForeground"
          >
            Sign In
          </Text>
        </Link>
      </YStack>
    </YStack>
  );
}

function FeatureItem({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <XStack
      alignItems="center"
      gap="$4"
      paddingVertical="$3"
      paddingHorizontal="$4"
      backgroundColor="$muted"
      borderRadius="$4"
    >
      <Ionicons name={icon} size={22} color="var(--primary)" />
      <Text fontSize={15} color="$color" fontWeight="500">
        {text}
      </Text>
    </XStack>
  );
}
