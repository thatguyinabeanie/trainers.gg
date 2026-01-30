import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
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
import { validatePassword, usernameSchema } from "@trainers/validators";

/**
 * Resolves a login identifier (email or username) to an email address.
 * If the identifier looks like an email, returns it as-is.
 * Otherwise, looks up the username in the database.
 */
async function resolveLoginIdentifier(
  identifier: string
): Promise<{ email: string | null; error: string | null }> {
  const trimmed = identifier.trim().toLowerCase();

  if (trimmed.includes("@")) {
    return { email: trimmed, error: null };
  }

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const isSignUp = mode === "signup";

  // Sign-in fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up additional fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, resetPassword, loading } =
    useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    setError(null);

    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

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

  const handleSignUp = async () => {
    setError(null);

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(`Password requires: ${passwordValidation.errors.join(", ")}`);
      return;
    }

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
      router.replace("/(tabs)/home");
    }
  };

  const handleForgotPassword = () => {
    const trimmed = identifier.trim();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert(
        "Enter Your Email",
        "Type your email address in the field above, then tap Forgot Password."
      );
      return;
    }

    resetPassword(trimmed).then(({ error: resetError }) => {
      if (resetError) {
        setError(resetError.message);
      } else {
        Alert.alert(
          "Check Your Email",
          "If an account exists with that email, we sent a password reset link."
        );
      }
    });
  };

  const toggleMode = () => {
    setMode(isSignUp ? "signin" : "signup");
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{ title: isSignUp ? "Create Account" : "Sign In" }}
      />
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
              {isSignUp ? "Join trainers.gg" : "Welcome Back"}
            </Text>
            <Text
              fontSize={15}
              color="$mutedForeground"
              textAlign="center"
              marginTop="$2"
            >
              {isSignUp ? "Create your account" : "Sign in to your account"}
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
            {/* Username — sign-up only */}
            {isSignUp && (
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
            )}

            {/* Email/identifier field */}
            {isSignUp ? (
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
            ) : (
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
            )}

            {/* Name fields — sign-up only */}
            {isSignUp && (
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
            )}

            {/* Password */}
            <YStack gap="$1">
              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder={isSignUp ? "Password *" : "Password"}
                placeholderTextColor="$mutedForeground"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isSignUp ? "new-password" : "password"}
              />
              {isSignUp && (
                <Text
                  fontSize={11}
                  color="$mutedForeground"
                  paddingHorizontal="$1"
                >
                  8+ chars, uppercase, lowercase, number, and symbol
                </Text>
              )}
            </YStack>

            {/* Confirm password — sign-up only */}
            {isSignUp && (
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
            )}
          </YStack>

          {/* Submit button */}
          <Button
            backgroundColor="$primary"
            borderWidth={0}
            borderRadius="$4"
            height={52}
            marginTop="$2"
            pressStyle={{ opacity: 0.85 }}
            opacity={loading ? 0.7 : 1}
            disabled={loading}
            onPress={isSignUp ? handleSignUp : handleSignIn}
          >
            {loading ? (
              <Spinner color="$primaryForeground" />
            ) : (
              <Text color="$primaryForeground" fontSize={16} fontWeight="600">
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </Button>

          {/* Forgot password — sign-in only */}
          {!isSignUp && (
            <Pressable onPress={handleForgotPassword}>
              <Text
                textAlign="center"
                color="$primary"
                fontSize={14}
                fontWeight="500"
              >
                Forgot password?
              </Text>
            </Pressable>
          )}

          {/* Mode toggle */}
          <XStack justifyContent="center" alignItems="center" marginTop="$2">
            <Text color="$mutedForeground" fontSize={14}>
              {isSignUp ? "Already have an account? " : "New here? "}
            </Text>
            <Pressable onPress={toggleMode}>
              <Text color="$primary" fontSize={14} fontWeight="600">
                {isSignUp ? "Sign In" : "Create Account"}
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
