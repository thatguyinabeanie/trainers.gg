import { useEffect, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  Spinner,
  useTheme,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function IndexScreen() {
  const {
    isAuthenticated,
    loading: authLoading,
    signInWithBluesky,
  } = useAuth();
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Redirect authenticated users to home
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || isAuthenticated) {
    return null;
  }

  const handleBlueskyPress = async () => {
    setBlueskyLoading(true);
    const { error } = await signInWithBluesky("https://bsky.social");
    setBlueskyLoading(false);

    if (error) {
      Alert.alert("Sign in failed", error.message);
    }
  };

  const handleComingSoon = (provider: string) => {
    Alert.alert(
      "Coming Soon",
      `Sign in with ${provider} will be available soon.`
    );
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <StatusBar style="auto" />
      <ScrollView
        flex={1}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding */}
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="$6"
          minHeight={240}
        >
          <YStack
            height={80}
            width={80}
            alignItems="center"
            justifyContent="center"
            borderRadius="$6"
            backgroundColor="$primary"
            marginBottom="$5"
          >
            <Ionicons name="trophy" size={42} color="white" />
          </YStack>

          <Text
            fontSize={32}
            fontWeight="800"
            color="$color"
            letterSpacing={-1}
          >
            trainers.gg
          </Text>

          <Text
            marginTop="$2"
            fontSize={16}
            color="$mutedForeground"
            textAlign="center"
          >
            The competitive Pokemon{"\n"}community platform
          </Text>
        </YStack>

        {/* Auth Buttons */}
        <YStack paddingHorizontal="$6" gap="$3">
          {/* Bluesky — Primary / Prominent */}
          <AuthButton
            onPress={handleBlueskyPress}
            variant="primary"
            icon={
              blueskyLoading ? (
                <Spinner size="small" color="white" />
              ) : (
                <Ionicons name="at" size={22} color="white" />
              )
            }
            label="Continue with Bluesky"
            disabled={blueskyLoading}
          />

          {/* Apple */}
          <AuthButton
            onPress={() => handleComingSoon("Apple")}
            variant="muted"
            icon={
              <Ionicons name="logo-apple" size={20} color={theme.color.val} />
            }
            label="Continue with Apple"
          />

          {/* Google */}
          <AuthButton
            onPress={() => handleComingSoon("Google")}
            variant="muted"
            icon={
              <Ionicons name="logo-google" size={18} color={theme.color.val} />
            }
            label="Continue with Google"
          />

          {/* X */}
          <AuthButton
            onPress={() => handleComingSoon("X")}
            variant="muted"
            icon={
              <Text fontSize={17} fontWeight="800" color="$color">
                X
              </Text>
            }
            label="Continue with X"
          />

          {/* Separator */}
          <XStack alignItems="center" gap="$3" marginVertical="$1">
            <YStack flex={1} height={1} backgroundColor="$muted" />
            <Text fontSize={13} color="$mutedForeground">
              or
            </Text>
            <YStack flex={1} height={1} backgroundColor="$muted" />
          </XStack>

          {/* Email */}
          <AuthButton
            onPress={() => router.push("/(auth)/sign-in")}
            variant="muted"
            icon={
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.mutedForeground.val}
              />
            }
            label="Continue with Email"
          />
        </YStack>

        {/* Terms */}
        <YStack
          paddingHorizontal="$8"
          paddingTop="$5"
          paddingBottom="$4"
          alignItems="center"
        >
          <Text
            fontSize={12}
            color="$mutedForeground"
            textAlign="center"
            lineHeight={18}
          >
            By continuing, you agree to our{" "}
            <Text fontSize={12} color="$primary" fontWeight="500">
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text fontSize={12} color="$primary" fontWeight="500">
              Privacy Policy
            </Text>
          </Text>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

// Reusable auth provider button
function AuthButton({
  onPress,
  variant,
  icon,
  label,
  disabled,
}: {
  onPress: () => void;
  variant: "primary" | "muted";
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";

  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      backgroundColor={isPrimary ? "$primary" : "$muted"}
      borderWidth={0}
      borderRadius="$4"
      height={52}
      pressStyle={{ opacity: 0.85 }}
      opacity={disabled ? 0.7 : 1}
    >
      <XStack alignItems="center" justifyContent="center" gap="$2.5">
        {icon}
        <Text
          color={isPrimary ? "white" : "$color"}
          fontSize={16}
          fontWeight="600"
        >
          {label}
        </Text>
      </XStack>
    </Button>
  );
}
