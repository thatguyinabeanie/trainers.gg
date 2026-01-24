import React from "react";
import { YStack, XStack, Text, type YStackProps } from "tamagui";

/**
 * Card components - minimal flat design with Tamagui theme support
 */

interface CardProps extends YStackProps {
  children: React.ReactNode;
}

export function Card({ children, ...props }: CardProps) {
  return (
    <YStack
      overflow="hidden"
      borderRadius="$4"
      backgroundColor="$card"
      {...props}
    >
      {children}
    </YStack>
  );
}

interface CardHeaderProps extends YStackProps {
  children: React.ReactNode;
}

export function CardHeader({ children, ...props }: CardHeaderProps) {
  return (
    <YStack gap="$1.5" padding="$5" {...props}>
      {children}
    </YStack>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
}

export function CardTitle({ children }: CardTitleProps) {
  return (
    <Text fontSize="$5" fontWeight="600" color="$cardForeground">
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

export function CardDescription({ children }: CardDescriptionProps) {
  return (
    <Text fontSize="$3" color="$mutedForeground">
      {children}
    </Text>
  );
}

interface CardContentProps extends YStackProps {
  children: React.ReactNode;
}

export function CardContent({ children, ...props }: CardContentProps) {
  return (
    <YStack paddingHorizontal="$5" paddingBottom="$5" {...props}>
      {children}
    </YStack>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
}

export function CardFooter({ children }: CardFooterProps) {
  return (
    <XStack
      alignItems="center"
      backgroundColor="$muted"
      paddingHorizontal="$5"
      paddingVertical="$4"
    >
      {children}
    </XStack>
  );
}
