import React from "react";
import {
  View,
  ActivityIndicator,
  type ViewProps,
  StyleSheet,
} from "react-native";
import { colors } from "@/lib/theme";

/**
 * Screen wrapper component matching shadcn/ui design language
 */

interface ScreenProps extends ViewProps {
  children?: React.ReactNode;
  loading?: boolean;
}

export function Screen({ children, loading, style, ...props }: ScreenProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer} {...props}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
