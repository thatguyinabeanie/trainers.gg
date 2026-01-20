import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";

export default function IndexScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-8">
      <Text className="mb-4 text-4xl font-bold text-primary-600">
        trainers.gg
      </Text>
      <Text className="mb-8 text-center text-lg text-gray-600">
        The social platform for Pokemon trainers, powered by Bluesky
      </Text>

      <Link href="/(tabs)/home" asChild>
        <Pressable className="rounded-lg bg-primary-600 px-6 py-3">
          <Text className="font-semibold text-white">Enter the Community</Text>
        </Pressable>
      </Link>
    </View>
  );
}
