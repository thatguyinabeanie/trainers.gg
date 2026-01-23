import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
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
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="mb-4 text-center text-2xl font-bold text-gray-900">
          Check Your Email
        </Text>
        <Text className="mb-8 text-center text-gray-600">
          We&apos;ve sent a confirmation link to {email}. Please check your
          email to verify your account.
        </Text>
        <Pressable
          className="rounded-lg bg-primary-600 px-6 py-3"
          onPress={() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.replace("/(auth)/sign-in" as any)
          }
        >
          <Text className="font-semibold text-white">Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center bg-white p-6">
          <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
            Create Account
          </Text>
          <Text className="mb-8 text-center text-gray-600">
            Join the trainers.gg community
          </Text>

          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-center text-red-600">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Username *
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              placeholder="trainer123"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Email *
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              placeholder="trainer@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View className="mb-4 flex-row gap-4">
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                First Name
              </Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
                placeholder="Ash"
                placeholderTextColor="#9CA3AF"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Last Name
              </Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
                placeholder="Ketchum"
                placeholderTextColor="#9CA3AF"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Password *
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Confirm Password *
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              placeholder="Confirm your password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <Pressable
            className="mb-4 rounded-lg bg-primary-600 py-4"
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-semibold text-white">
                Create Account
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center">
            <Text className="text-gray-600">Already have an account? </Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/(auth)/sign-in" as any} asChild>
              <Pressable>
                <Text className="font-semibold text-primary-600">Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
