import { useEffect, useState, type ReactNode } from "react";
import { Alert, Modal, Pressable } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  ScrollView,
  Spinner,
  useTheme,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/supabase";

export default function IndexScreen() {
  const {
    isAuthenticated,
    loading: authLoading,
    signInWithBluesky,
  } = useAuth();
  const [showBlueskySheet, setShowBlueskySheet] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState<string | null>(null);
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

  const handleBlueskySubmit = async () => {
    setBlueskyError(null);
    const trimmed = blueskyHandle.trim();

    if (!trimmed) {
      setBlueskyError("Please enter your Bluesky handle");
      return;
    }
    if (!trimmed.includes(".")) {
      setBlueskyError("Enter your full handle (e.g., username.bsky.social)");
      return;
    }

    setBlueskyLoading(true);
    const { error } = await signInWithBluesky(trimmed);
    setBlueskyLoading(false);

    if (error) {
      setBlueskyError(error.message);
    } else {
      setShowBlueskySheet(false);
      setBlueskyHandle("");
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
            onPress={() => setShowBlueskySheet(true)}
            variant="primary"
            icon={<Ionicons name="at" size={22} color="white" />}
            label="Continue with Bluesky"
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

      {/* Bluesky Handle Bottom Sheet */}
      <Modal
        visible={showBlueskySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlueskySheet(false)}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
          onPress={() => {
            setShowBlueskySheet(false);
            setBlueskyError(null);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="$background"
              borderTopLeftRadius="$6"
              borderTopRightRadius="$6"
              padding="$6"
              gap="$4"
              paddingBottom={insets.bottom + 24}
            >
              {/* Drag handle */}
              <YStack
                width={36}
                height={5}
                backgroundColor="$mutedForeground"
                opacity={0.3}
                borderRadius="$10"
                alignSelf="center"
                marginBottom="$2"
              />

              <YStack alignItems="center" gap="$2">
                <Text fontSize={20} fontWeight="700" color="$color">
                  Continue with Bluesky
                </Text>
                <Text fontSize={14} color="$mutedForeground" textAlign="center">
                  Enter your Bluesky handle
                </Text>
              </YStack>

              {blueskyError && (
                <YStack backgroundColor="$red3" borderRadius="$4" padding="$3">
                  <Text color="$red10" textAlign="center" fontSize={14}>
                    {blueskyError}
                  </Text>
                </YStack>
              )}

              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="username.bsky.social"
                placeholderTextColor="$mutedForeground"
                value={blueskyHandle}
                onChangeText={setBlueskyHandle}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <Button
                onPress={handleBlueskySubmit}
                disabled={blueskyLoading}
                backgroundColor="$primary"
                borderWidth={0}
                borderRadius="$4"
                height={52}
                pressStyle={{ opacity: 0.85 }}
                opacity={blueskyLoading ? 0.7 : 1}
              >
                {blueskyLoading ? (
                  <Spinner color="white" />
                ) : (
                  <Text color="white" fontSize={16} fontWeight="600">
                    Continue
                  </Text>
                )}
              </Button>

              <Pressable
                onPress={() => {
                  setShowBlueskySheet(false);
                  setBlueskyError(null);
                }}
                disabled={blueskyLoading}
              >
                <Text
                  textAlign="center"
                  color="$mutedForeground"
                  fontSize={14}
                  paddingVertical="$2"
                >
                  Cancel
                </Text>
              </Pressable>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </YStack>
  );
}

// Reusable auth provider button
function AuthButton({
  onPress,
  variant,
  icon,
  label,
}: {
  onPress: () => void;
  variant: "primary" | "muted";
  icon: ReactNode;
  label: string;
}) {
  const isPrimary = variant === "primary";

  return (
    <Button
      onPress={onPress}
      backgroundColor={isPrimary ? "$primary" : "$muted"}
      borderWidth={0}
      borderRadius="$4"
      height={52}
      pressStyle={{ opacity: 0.85 }}
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
