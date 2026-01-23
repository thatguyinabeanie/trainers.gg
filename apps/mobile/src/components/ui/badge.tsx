import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

/**
 * Badge component - minimal flat design
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case "default":
      return {
        container: { backgroundColor: colors.primary.DEFAULT + "1A" },
        text: { color: colors.primary.DEFAULT },
      };
    case "secondary":
      return {
        container: { backgroundColor: colors.muted.DEFAULT },
        text: { color: colors.muted.foreground },
      };
    case "destructive":
      return {
        container: { backgroundColor: colors.destructive.DEFAULT + "1A" },
        text: { color: colors.destructive.DEFAULT },
      };
    case "outline":
      return {
        container: { backgroundColor: colors.muted.DEFAULT + "80" },
        text: { color: colors.foreground },
      };
  }
};

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const variantStyles = getVariantStyles(variant);

  return (
    <View style={[styles.container, variantStyles.container, style]}>
      <Text style={[styles.text, variantStyles.text]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
