import React from "react";
import { XStack, Text } from "tamagui";

/**
 * Badge component - minimal flat design with Tamagui theme support
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "default":
        return {
          backgroundColor: "$primary" as const,
          opacity: 0.15,
          textColor: "$primary" as const,
        };
      case "secondary":
        return {
          backgroundColor: "$muted" as const,
          opacity: 1,
          textColor: "$mutedForeground" as const,
        };
      case "destructive":
        return {
          backgroundColor: "$destructive" as const,
          opacity: 0.15,
          textColor: "$destructive" as const,
        };
      case "outline":
        return {
          backgroundColor: "$muted" as const,
          opacity: 0.5,
          textColor: "$color" as const,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <XStack
      alignSelf="flex-start"
      borderRadius="$10"
      paddingHorizontal="$3"
      paddingVertical="$1"
      backgroundColor={styles.backgroundColor}
      opacity={styles.opacity === 1 ? undefined : styles.opacity}
    >
      <Text fontSize="$2" fontWeight="500" color={styles.textColor}>
        {children}
      </Text>
    </XStack>
  );
}
