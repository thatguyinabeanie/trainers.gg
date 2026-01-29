import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  ScrollView,
  Spinner,
} from "tamagui";
import { useAuth, getSupabase } from "@/lib/supabase";
import { BlueskyAuthButton } from "@/components/auth/bluesky-auth-button";

/**
 * Resolves a login identifier (email or username) to an email address.
 * If the identifier looks like an email, returns it as-is.
 * Otherwise, looks up the username in the database.
 */
async function resolveLoginIdentifier(
  identifier: string
): Promise<{ email: string | null; error: string | null }> {
  const trimmed = identifier.trim().toLowerCase();

  // If it looks like an email, return as-is
  if (trimmed.includes("@")) {
    return { email: trimmed, error: null };
  }

  // Otherwise, look up username
  try {
    const { data, error } = await getSupabase()
      .from("users")
      .select("email")
      .ilike("username", trimmed)
      .maybeSingle();

    if (error) {
      return { email: null, error: "Failed to look up username" };
    }

    if (!data) {
      return { email: null, error: "Username not found" };
    }

    return { email: data.email, error: null };
  } catch {
    return { email: null, error: "Failed to connect to server" };
  }
}

export default function SignInScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail, signInWithBluesky, loading } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    setError(null);

    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Resolve username to email if needed
    const { email, error: resolveError } =
      await resolveLoginIdentifier(identifier);

    if (resolveError || !email) {
      setError(resolveError || "Could not find account");
      return;
    }

    const { error: signInError } = await signInWithEmail(email, password);

    if (signInError) {
      setError(signInError.message);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        flex={1}
        backgroundColor="$background"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} justifyContent="center" padding="$6" gap="$4">
          <YStack alignItems="center" marginBottom="$4">
            <Text
              fontSize={28}
              fontWeight="700"
              color="$color"
              textAlign="center"
            >
              Welcome Back
            </Text>
            <Text
              fontSize={15}
              color="$mutedForeground"
              textAlign="center"
              marginTop="$2"
            >
              Sign in to your account
            </Text>
          </YStack>

          {error && (
            <YStack backgroundColor="$red3" borderRadius="$4" padding="$3">
              <Text color="$red10" textAlign="center" fontSize={14}>
                {error}
              </Text>
            </YStack>
          )}

          <YStack gap="$3">
            <YStack gap="$1">
              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="Email or Username"
                placeholderTextColor="$mutedForeground"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="username"
              />
              <Text
                fontSize={12}
                color="$mutedForeground"
                paddingHorizontal="$1"
              >
                No @trainers.gg needed for username
              </Text>
            </YStack>

            <Input
              backgroundColor="$muted"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Password"
              placeholderTextColor="$mutedForeground"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </YStack>

          <Button
            backgroundColor="$primary"
            borderWidth={0}
            borderRadius="$4"
            height={52}
            marginTop="$2"
            pressStyle={{ opacity: 0.85 }}
            opacity={loading ? 0.7 : 1}
            disabled={loading}
            onPress={handleSignIn}
          >
            {loading ? (
              <Spinner color="$primaryForeground" />
            ) : (
              <Text color="$primaryForeground" fontSize={16} fontWeight="600">
                Sign In
              </Text>
            )}
          </Button>

          {/* Separator */}
          <XStack alignItems="center" gap="$3" marginVertical="$1">
            <YStack flex={1} height={1} backgroundColor="$muted" />
            <Text fontSize={12} color="$mutedForeground">
              OR
            </Text>
            <YStack flex={1} height={1} backgroundColor="$muted" />
          </XStack>

          {/* Bluesky sign-in */}
          <BlueskyAuthButton
            onSignIn={async (handle) => {
              const { error, isNew } = await signInWithBluesky(handle);
              if (!error) {
                router.replace("/(tabs)/home");
              }
              return { error };
            }}
            loading={loading}
          />

          <XStack justifyContent="center" alignItems="center" marginTop="$2">
            <Text color="$mutedForeground" fontSize={14}>
              Don&apos;t have an account?{" "}
            </Text>
            <Link href={"/(auth)/sign-up" as Href} asChild>
              <Pressable>
                <Text color="$primary" fontSize={14} fontWeight="600">
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
