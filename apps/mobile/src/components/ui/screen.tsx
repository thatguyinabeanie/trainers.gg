import React from "react";
import { ActivityIndicator } from "react-native";
import { YStack, type YStackProps, useTheme } from "tamagui";

/**
 * Screen wrapper component with Tamagui theming
 */

interface ScreenProps extends YStackProps {
  children?: React.ReactNode;
  loading?: boolean;
}

export function Screen({ children, loading, ...props }: ScreenProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        {...props}
      >
        <ActivityIndicator size="large" color={theme.primary.val} />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" {...props}>
      {children}
    </YStack>
  );
}
