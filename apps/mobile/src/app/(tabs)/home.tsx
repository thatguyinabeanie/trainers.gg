import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Home Feed</Text>
      <Text className="text-gray-600">
        Your Pokemon community feed will appear here.
      </Text>
      <Text className="mt-4 text-sm text-gray-400">
        Sign in with Bluesky to see posts from trainers you follow.
      </Text>
    </View>
  );
}
