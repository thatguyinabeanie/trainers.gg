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
import { useAuth } from "@/lib/supabase";
import { validatePassword, usernameSchema } from "@trainers/validators";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signUpWithEmail, loading } = useAuth();
  const router = useRouter();

  const handleSignUp = async () => {
    setError(null);

    if (!email || !password || !confirmPassword || !username) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password using shared schema
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(`Password requires: ${passwordValidation.errors.join(", ")}`);
      return;
    }

    // Validate username using shared schema
    const usernameResult = usernameSchema.safeParse(username);
    if (!usernameResult.success) {
      setError(usernameResult.error.errors[0]?.message ?? "Invalid username");
      return;
    }

    const { error: signUpError } = await signUpWithEmail(email, password, {
      username,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Successfully signed up and logged in - redirect to home
      router.replace("/(tabs)/home" as never);
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
              Create Account
            </Text>
            <Text
              fontSize={15}
              color="$mutedForeground"
              textAlign="center"
              marginTop="$2"
            >
              Join the trainers.gg community
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
                placeholder="Username *"
                placeholderTextColor="$mutedForeground"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
              />
              <Text
                fontSize={12}
                color="$mutedForeground"
                paddingHorizontal="$1"
              >
                Your Bluesky handle:{" "}
                <Text fontSize={12} color="$color" fontWeight="500">
                  @{username.toLowerCase() || "username"}.trainers.gg
                </Text>
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
              placeholder="Email *"
              placeholderTextColor="$mutedForeground"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <XStack gap="$3">
              <Input
                flex={1}
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="First Name"
                placeholderTextColor="$mutedForeground"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
              />

              <Input
                flex={1}
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="Last Name"
                placeholderTextColor="$mutedForeground"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
              />
            </XStack>

            <YStack gap="$1">
              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="Password *"
                placeholderTextColor="$mutedForeground"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Text
                fontSize={11}
                color="$mutedForeground"
                paddingHorizontal="$1"
              >
                8+ chars, uppercase, lowercase, number, and symbol
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
              placeholder="Confirm Password *"
              placeholderTextColor="$mutedForeground"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
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
            onPress={handleSignUp}
          >
            {loading ? (
              <Spinner color="$primaryForeground" />
            ) : (
              <Text color="$primaryForeground" fontSize={16} fontWeight="600">
                Create Account
              </Text>
            )}
          </Button>

          <XStack justifyContent="center" alignItems="center" marginTop="$2">
            <Text color="$mutedForeground" fontSize={14}>
              Already have an account?{" "}
            </Text>
            <Link href={"/(auth)/sign-in" as Href} asChild>
              <Pressable>
                <Text color="$primary" fontSize={14} fontWeight="600">
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
