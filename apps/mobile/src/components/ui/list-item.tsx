import React from "react";
import { type ViewStyle, Pressable, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack, Text, useTheme } from "tamagui";

/**
 * ListItem and ListSection components - minimal flat design with Tamagui
 */

interface ListItemProps extends Omit<PressableProps, "style"> {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  showChevron?: boolean;
  destructive?: boolean;
  style?: ViewStyle;
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor,
  rightIcon,
  rightText,
  showChevron = true,
  destructive = false,
  style,
  ...props
}: ListItemProps) {
  const theme = useTheme();

  const defaultIconColor = destructive
    ? theme.destructive.val
    : theme.mutedForeground.val;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: pressed ? theme.muted.val : theme.card.val,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        style,
      ]}
      {...props}
    >
      {icon && (
        <XStack
          marginRight="$3.5"
          height={36}
          width={36}
          alignItems="center"
          justifyContent="center"
          borderRadius="$3"
          backgroundColor="$muted"
        >
          <Ionicons
            name={icon}
            size={20}
            color={iconColor || defaultIconColor}
          />
        </XStack>
      )}

      <YStack flex={1}>
        <Text fontSize="$4" color={destructive ? "$destructive" : "$color"}>
          {title}
        </Text>
        {subtitle && (
          <Text marginTop="$0.5" fontSize="$2" color="$mutedForeground">
            {subtitle}
          </Text>
        )}
      </YStack>

      {rightText && (
        <Text marginRight="$2" fontSize="$2" color="$mutedForeground">
          {rightText}
        </Text>
      )}

      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={20}
          color={theme.mutedForeground.val}
        />
      )}

      {showChevron && !rightIcon && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.mutedForeground.val}
          style={{ opacity: 0.5 }}
        />
      )}
    </Pressable>
  );
}

interface ListSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ListSection({ title, children, style }: ListSectionProps) {
  return (
    <YStack marginBottom="$7" style={style}>
      {title && (
        <Text
          marginBottom="$2.5"
          paddingHorizontal="$4"
          fontSize="$2"
          fontWeight="500"
          textTransform="uppercase"
          letterSpacing={0.5}
          color="$mutedForeground"
        >
          {title}
        </Text>
      )}
      <YStack overflow="hidden" borderRadius="$5" backgroundColor="$card">
        {children}
      </YStack>
    </YStack>
  );
}
