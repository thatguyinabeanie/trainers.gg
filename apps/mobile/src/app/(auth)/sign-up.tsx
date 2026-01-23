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

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
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
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        padding="$6"
      >
        <YStack
          backgroundColor="$backgroundStrong"
          borderRadius="$6"
          padding="$6"
          alignItems="center"
          maxWidth={320}
        >
          <Text
            fontSize={24}
            fontWeight="700"
            color="$color"
            textAlign="center"
            marginBottom="$3"
          >
            Check Your Email
          </Text>
          <Text
            fontSize={15}
            color="$colorTransparent"
            textAlign="center"
            marginBottom="$6"
            opacity={0.7}
            lineHeight={22}
          >
            We&apos;ve sent a confirmation link to {email}. Please verify your
            account to continue.
          </Text>
          <Button
            backgroundColor="$primary"
            borderWidth={0}
            borderRadius="$4"
            paddingHorizontal="$6"
            paddingVertical="$3"
            pressStyle={{ opacity: 0.85 }}
            onPress={() =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              router.replace("/(auth)/sign-in" as any)
            }
          >
            <Text color="$primaryForeground" fontSize={15} fontWeight="600">
              Go to Sign In
            </Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

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
              color="$colorTransparent"
              textAlign="center"
              marginTop="$2"
              opacity={0.6}
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
            <Input
              backgroundColor="$backgroundStrong"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Username *"
              placeholderTextColor="$colorTransparent"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />

            <Input
              backgroundColor="$backgroundStrong"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Email *"
              placeholderTextColor="$colorTransparent"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <XStack gap="$3">
              <Input
                flex={1}
                backgroundColor="$backgroundStrong"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="First Name"
                placeholderTextColor="$colorTransparent"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
              />

              <Input
                flex={1}
                backgroundColor="$backgroundStrong"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="Last Name"
                placeholderTextColor="$colorTransparent"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
              />
            </XStack>

            <Input
              backgroundColor="$backgroundStrong"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Password *"
              placeholderTextColor="$colorTransparent"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <Input
              backgroundColor="$backgroundStrong"
              borderWidth={0}
              borderRadius="$4"
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              fontSize={16}
              color="$color"
              placeholder="Confirm Password *"
              placeholderTextColor="$colorTransparent"
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
            paddingVertical="$3.5"
            marginTop="$2"
            pressStyle={{ opacity: 0.85 }}
            opacity={loading ? 0.7 : 1}
            disabled={loading}
            onPress={handleSignUp}
          >
            {loading ? (
              <Spinner color="$primaryForeground" />
            ) : (
              <Text
                color="$primaryForeground"
                fontSize={16}
                fontWeight="600"
                textAlign="center"
              >
                Create Account
              </Text>
            )}
          </Button>

          <XStack justifyContent="center" alignItems="center" marginTop="$2">
            <Text color="$colorTransparent" fontSize={14} opacity={0.6}>
              Already have an account?{" "}
            </Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/(auth)/sign-in" as any} asChild>
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
