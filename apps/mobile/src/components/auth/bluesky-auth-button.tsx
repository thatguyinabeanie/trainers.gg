import { Pressable } from "react-native";
import { XStack, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "tamagui";

interface BlueskyAuthButtonProps {
  onPress: () => void;
  label?: string;
  loading?: boolean;
}

export function BlueskyAuthButton({
  onPress,
  label = "Sign in with Bluesky",
  loading,
}: BlueskyAuthButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      <XStack
        backgroundColor="$muted"
        borderRadius="$4"
        height={52}
        alignItems="center"
        justifyContent="center"
        gap="$2"
      >
        <Ionicons name="at-outline" size={20} color={theme.primary.val} />
        <Text color="$color" fontSize={16} fontWeight="600">
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}
