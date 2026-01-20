import { View, Text } from "react-native";

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Explore</Text>
      <Text className="text-gray-600">
        Discover trending Pokemon content and trainers.
      </Text>
    </View>
  );
}
