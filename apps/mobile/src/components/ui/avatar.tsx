import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

/**
 * Avatar component - minimal flat design
 */

interface AvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  style?: ViewStyle;
}

const sizes = {
  sm: { container: 32, text: 12 },
  md: { container: 40, text: 14 },
  lg: { container: 56, text: 18 },
  xl: { container: 80, text: 24 },
};

export function Avatar({ size = "md", fallback, style }: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const sizeConfig = sizes[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeConfig.text }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.muted.DEFAULT,
  },
  text: {
    fontWeight: "600",
    color: colors.muted.foreground,
  },
});
