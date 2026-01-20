import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Settings</Text>
      <Text className="text-gray-600">Your settings and preferences.</Text>
    </View>
  );
}
