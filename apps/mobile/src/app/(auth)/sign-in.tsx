import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  ScrollView,
  Spinner,
} from "tamagui";
import { useAuth } from "@/lib/supabase";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail, loading } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
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
            <Input
              backgroundColor="$muted"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Email"
              placeholderTextColor="$mutedForeground"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

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

          <XStack justifyContent="center" alignItems="center" marginTop="$2">
            <Text color="$mutedForeground" fontSize={14}>
              Don&apos;t have an account?{" "}
            </Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/(auth)/sign-up" as any} asChild>
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
