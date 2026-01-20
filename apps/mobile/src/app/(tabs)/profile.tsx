import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Profile</Text>
      <Text className="text-gray-600">Your profile will be displayed here.</Text>
      <Text className="mt-4 text-sm text-gray-400">
        Sign in to view and edit your profile.
      </Text>
    </View>
  );
}
