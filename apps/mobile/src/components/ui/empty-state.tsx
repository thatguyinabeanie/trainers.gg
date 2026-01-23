import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { colors } from "@/lib/theme";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 999,
    backgroundColor: colors.muted.DEFAULT + "60",
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  description: {
    marginTop: 8,
    maxWidth: 280,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted.foreground,
  },
  button: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT + "1A",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonPressed: {
    backgroundColor: colors.primary.DEFAULT + "26",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary.DEFAULT,
  },
});
