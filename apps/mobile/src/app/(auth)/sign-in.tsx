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
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center bg-white p-6">
          <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
            Welcome Back
          </Text>
          <Text className="mb-8 text-center text-gray-600">
            Sign in to your trainers.gg account
          </Text>

          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-center text-red-600">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Email
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

          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Password
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <Pressable
            className="mb-4 rounded-lg bg-primary-600 py-4"
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-semibold text-white">
                Sign In
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center">
            <Text className="text-gray-600">Don&apos;t have an account? </Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/(auth)/sign-up" as any} asChild>
              <Pressable>
                <Text className="font-semibold text-primary-600">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
