import { useEffect, useState, useMemo, type ReactNode } from "react";
import { Alert, Pressable, Linking } from "react-native";
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

// ---------------------------------------------------------------------------
// Handle validation (shared logic with web)
// ---------------------------------------------------------------------------

type HandleValidation =
  | { status: "empty" }
  | { status: "typing" }
  | { status: "needs-domain" }
  | { status: "valid"; normalized: string }
  | { status: "invalid"; reason: string };

function validateBlueskyHandle(raw: string): HandleValidation {
  const handle = raw.trim().replace(/^@/, "");
  if (!handle) return { status: "empty" };
  if (handle.length < 2) return { status: "typing" };
  if (!handle.includes(".")) return { status: "needs-domain" };

  const parts = handle.split(".");
  if (parts.some((p) => p.length === 0))
    return { status: "invalid", reason: "Handle format looks incomplete" };

  const tld = parts[parts.length - 1];
  if (tld && tld.length < 2) return { status: "typing" };

  if (!/^[a-zA-Z0-9.-]+$/.test(handle))
    return {
      status: "invalid",
      reason: "Only letters, numbers, hyphens, and dots",
    };

  return { status: "valid", normalized: handle.toLowerCase() };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function IndexScreen() {
  const {
    isAuthenticated,
    loading: authLoading,
    signInWithBluesky,
  } = useAuth();
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState<string | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const validation = useMemo(
    () => validateBlueskyHandle(blueskyHandle),
    [blueskyHandle]
  );
  const rawUsername = blueskyHandle.trim().replace(/^@/, "");
  const isValid = validation.status === "valid";

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
    if (validation.status !== "valid") return;

    setBlueskyError(null);
    setBlueskyLoading(true);
    const { error } = await signInWithBluesky(validation.normalized);
    setBlueskyLoading(false);

    if (error) {
      setBlueskyError(error.message);
    } else {
      setShowBlueskyForm(false);
      setBlueskyHandle("");
    }
  };

  const handleDomainPress = (domain: string) => {
    setBlueskyHandle(`${rawUsername}.${domain}`);
    setBlueskyError(null);
  };

  const handleBack = () => {
    setShowBlueskyForm(false);
    setBlueskyHandle("");
    setBlueskyError(null);
    setBlueskyLoading(false);
  };

  const handleComingSoon = (provider: string) => {
    Alert.alert(
      "Coming Soon",
      `Sign in with ${provider} will be available soon.`
    );
  };

  // ---------------------------------------------------------------------------
  // Inline Bluesky handle form view
  // ---------------------------------------------------------------------------
  if (showBlueskyForm) {
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
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal="$6"
            gap="$5"
          >
            {/* Branded header — Bluesky butterfly in blue circle */}
            <YStack alignItems="center" gap="$3">
              <YStack
                height={80}
                width={80}
                alignItems="center"
                justifyContent="center"
                borderRadius="$6"
                backgroundColor="rgba(0, 133, 255, 0.1)"
              >
                <Ionicons name="at" size={42} color="#0085FF" />
              </YStack>

              <Text
                fontSize={22}
                fontWeight="700"
                color="$color"
                textAlign="center"
              >
                Continue with Bluesky
              </Text>
              <Text
                fontSize={14}
                color="$mutedForeground"
                textAlign="center"
                paddingHorizontal="$4"
              >
                Enter your Bluesky handle to sign in or create an account.
              </Text>
            </YStack>

            {/* Handle input with @ prefix */}
            <YStack width="100%" gap="$3">
              <XStack
                backgroundColor="$muted"
                borderRadius="$4"
                alignItems="center"
                borderWidth={1}
                borderColor={isValid ? "#10b981" : "transparent"}
              >
                <Text
                  paddingLeft="$3"
                  fontSize={16}
                  color="$mutedForeground"
                  fontWeight="500"
                >
                  @
                </Text>
                <Input
                  flex={1}
                  backgroundColor="transparent"
                  borderWidth={0}
                  paddingHorizontal="$2"
                  paddingVertical="$3.5"
                  fontSize={16}
                  color="$color"
                  placeholder="username.bsky.social"
                  placeholderTextColor="$mutedForeground"
                  value={blueskyHandle}
                  onChangeText={(text) => {
                    setBlueskyHandle(text);
                    setBlueskyError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {isValid && (
                  <YStack paddingRight="$3">
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10b981"
                    />
                  </YStack>
                )}
              </XStack>

              {/* Fixed-height feedback area to prevent layout shift */}
              <YStack minHeight={32}>
                {/* Domain suggestion pills */}
                {validation.status === "needs-domain" &&
                  rawUsername.length >= 2 && (
                    <XStack gap="$2" flexWrap="wrap">
                      <Pressable
                        onPress={() => handleDomainPress("bsky.social")}
                      >
                        <YStack
                          backgroundColor="$muted"
                          paddingHorizontal="$3"
                          paddingVertical="$1.5"
                          borderRadius="$10"
                        >
                          <Text fontSize={13} color="$color" fontWeight="500">
                            {rawUsername}.bsky.social
                          </Text>
                        </YStack>
                      </Pressable>
                    </XStack>
                  )}

                {/* Validation hint */}
                {validation.status === "invalid" && (
                  <Text fontSize={12} color="$mutedForeground">
                    {validation.reason}
                  </Text>
                )}
              </YStack>
            </YStack>

            {/* Error alert */}
            {blueskyError && (
              <XStack
                backgroundColor="$red3"
                borderRadius="$4"
                padding="$3"
                gap="$2"
                alignItems="flex-start"
                width="100%"
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.red10?.val ?? "#ef4444"}
                />
                <Text color="$red10" fontSize={14} flex={1}>
                  {blueskyError}
                </Text>
              </XStack>
            )}

            {/* Redirect notice */}
            <XStack gap="$1.5" alignItems="center">
              <Ionicons
                name="open-outline"
                size={14}
                color={theme.mutedForeground.val}
              />
              <Text fontSize={12} color="$mutedForeground">
                You&apos;ll be redirected to Bluesky to authorize
              </Text>
            </XStack>

            {/* Submit button — Bluesky brand blue */}
            <Button
              onPress={handleBlueskySubmit}
              disabled={!isValid || blueskyLoading}
              backgroundColor="#0085FF"
              borderWidth={0}
              borderRadius="$4"
              height={52}
              width="100%"
              pressStyle={{ opacity: 0.85 }}
              opacity={!isValid || blueskyLoading ? 0.5 : 1}
            >
              {blueskyLoading ? (
                <Spinner color="white" />
              ) : (
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="at" size={20} color="white" />
                  <Text color="white" fontSize={16} fontWeight="600">
                    Continue to Bluesky
                  </Text>
                </XStack>
              )}
            </Button>

            {/* Help link */}
            <Text fontSize={12} color="$mutedForeground" textAlign="center">
              Don&apos;t have a Bluesky account?{" "}
              <Text
                fontSize={12}
                color="$primary"
                fontWeight="500"
                onPress={() => Linking.openURL("https://bsky.app")}
              >
                Create one
              </Text>
            </Text>

            {/* Back link */}
            <Pressable onPress={handleBack} disabled={blueskyLoading}>
              <Text color="$mutedForeground" fontSize={14} paddingVertical="$2">
                Back to all sign-in options
              </Text>
            </Pressable>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // ---------------------------------------------------------------------------
  // Default: social auth buttons
  // ---------------------------------------------------------------------------
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
            onPress={() => setShowBlueskyForm(true)}
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
