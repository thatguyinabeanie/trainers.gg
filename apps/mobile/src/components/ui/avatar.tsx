import React from "react";
import { XStack, Text, type XStackProps } from "tamagui";

/**
 * Avatar component - minimal flat design with Tamagui theme support
 */

interface AvatarProps extends Omit<XStackProps, "size"> {
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
}

const sizes = {
  sm: { container: 32, text: 12, radius: 16 },
  md: { container: 40, text: 14, radius: 20 },
  lg: { container: 56, text: 18, radius: 28 },
  xl: { container: 80, text: 24, radius: 40 },
};

export function Avatar({ size = "md", fallback, ...props }: AvatarProps) {
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
    <XStack
      alignItems="center"
      justifyContent="center"
      width={sizeConfig.container}
      height={sizeConfig.container}
      borderRadius={sizeConfig.radius}
      backgroundColor="$muted"
      {...props}
    >
      <Text
        fontSize={sizeConfig.text}
        fontWeight="600"
        color="$mutedForeground"
      >
        {initials}
      </Text>
    </XStack>
  );
}
