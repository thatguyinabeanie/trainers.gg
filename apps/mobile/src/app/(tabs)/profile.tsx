import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useAuth, getUserDisplayName } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1b9388" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-white p-4">
        <Text className="mb-4 text-2xl font-bold text-gray-900">Profile</Text>
        <Text className="mb-4 text-gray-600">
          Sign in to view and edit your profile.
        </Text>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={"/(auth)/sign-in" as any} asChild>
          <Pressable className="rounded-lg bg-primary-600 px-6 py-3">
            <Text className="text-center font-semibold text-white">
              Sign In
            </Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const displayName = getUserDisplayName(user);
  const username = user?.user_metadata?.username as string | undefined;
  const email = user?.email;

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Profile</Text>

      <View className="mb-6 rounded-lg bg-gray-50 p-4">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <Text className="text-2xl font-bold text-primary-600">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text className="text-xl font-semibold text-gray-900">
          {displayName}
        </Text>
        {username && <Text className="text-gray-600">@{username}</Text>}
        {email && <Text className="mt-1 text-sm text-gray-500">{email}</Text>}
      </View>

      <View className="gap-3">
        <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <Text className="font-medium text-gray-900">Edit Profile</Text>
        </Pressable>

        <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <Text className="font-medium text-gray-900">My Teams</Text>
        </Pressable>

        <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <Text className="font-medium text-gray-900">Tournament History</Text>
        </Pressable>
      </View>
    </View>
  );
}
