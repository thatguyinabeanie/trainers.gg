import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, getUserDisplayName, useSiteRoles } from "@/lib/supabase";

export default function SettingsScreen() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const { siteRoles } = useSiteRoles();
  const router = useRouter();

  const displayName = getUserDisplayName(user);
  const username = user?.user_metadata?.username as string | undefined;

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1b9388" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Settings</Text>

      <View className="gap-3">
        <Text className="mb-2 text-sm font-medium uppercase text-gray-500">
          Account
        </Text>

        {isAuthenticated ? (
          <>
            <View className="mb-4 rounded-lg bg-gray-50 p-4">
              <Text className="text-sm text-gray-500">Signed in as</Text>
              <Text className="font-semibold text-gray-900">{displayName}</Text>
              {username && <Text className="text-gray-600">@{username}</Text>}
              <Text className="text-sm text-gray-500">{user?.email}</Text>

              {siteRoles.length > 0 && (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {siteRoles.map((role) => (
                    <View
                      key={role}
                      className="rounded-full bg-green-100 px-3 py-1"
                    >
                      <Text className="text-xs font-medium text-green-700">
                        {role}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <Text className="font-medium text-gray-900">Change Password</Text>
            </Pressable>

            <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <Text className="font-medium text-gray-900">
                Notification Preferences
              </Text>
            </Pressable>

            <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <Text className="font-medium text-gray-900">
                Privacy Settings
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="mb-4 rounded-lg bg-gray-50 p-4">
            <Text className="text-gray-600">
              Sign in to access account settings
            </Text>
          </View>
        )}

        <Text className="mb-2 mt-4 text-sm font-medium uppercase text-gray-500">
          App
        </Text>

        <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <Text className="font-medium text-gray-900">Appearance</Text>
        </Pressable>

        <Pressable className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <Text className="font-medium text-gray-900">About</Text>
        </Pressable>

        {isAuthenticated && (
          <Pressable
            className="mt-4 rounded-lg bg-red-50 px-4 py-3"
            onPress={handleSignOut}
          >
            <Text className="text-center font-medium text-red-600">
              Sign Out
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
