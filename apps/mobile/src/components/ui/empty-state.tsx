import React from "react";
import { type ViewStyle } from "react-native";
import { YStack, Text, Button, type YStackProps } from "tamagui";

interface EmptyStateProps extends Omit<YStackProps, "style"> {
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
  ...props
}: EmptyStateProps) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$8"
      paddingVertical="$10"
      {...props}
    >
      {icon && (
        <YStack
          marginBottom="$5"
          padding="$4"
          borderRadius="$12"
          backgroundColor="$muted"
          opacity={0.6}
        >
          {icon}
        </YStack>
      )}

      <Text textAlign="center" fontSize="$6" fontWeight="600" color="$color">
        {title}
      </Text>

      {description && (
        <Text
          marginTop="$2"
          maxWidth={280}
          textAlign="center"
          fontSize="$4"
          lineHeight="$5"
          color="$mutedForeground"
        >
          {description}
        </Text>
      )}

      {action && (
        <Button
          marginTop="$6"
          borderRadius="$4"
          backgroundColor="$primaryMuted"
          paddingHorizontal="$5"
          paddingVertical="$3"
          pressStyle={{ backgroundColor: "$primaryMuted", opacity: 0.8 }}
          onPress={action.onPress}
        >
          <Text fontSize="$4" fontWeight="600" color="$primary">
            {action.label}
          </Text>
        </Button>
      )}
    </YStack>
  );
}
