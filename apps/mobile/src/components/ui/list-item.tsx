import React from "react";
import {
  View,
  Text,
  Pressable,
  type PressableProps,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

/**
 * ListItem and ListSection components - minimal flat design
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
  const _textColor = destructive
    ? colors.destructive.DEFAULT
    : colors.foreground;
  const defaultIconColor = destructive
    ? colors.destructive.DEFAULT
    : colors.muted.foreground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        pressed && styles.listItemPressed,
        style,
      ]}
      {...props}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={iconColor || defaultIconColor}
          />
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: destructive
                ? colors.destructive.DEFAULT
                : colors.foreground,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {rightText && <Text style={styles.rightText}>{rightText}</Text>}

      {rightIcon && (
        <Ionicons name={rightIcon} size={20} color={colors.muted.foreground} />
      )}

      {showChevron && !rightIcon && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.muted.foreground + "80"}
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
    <View style={[styles.section, style]}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listItemPressed: {
    backgroundColor: colors.muted.DEFAULT + "60",
  },
  iconContainer: {
    marginRight: 14,
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.muted.DEFAULT,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted.foreground,
  },
  rightText: {
    marginRight: 8,
    fontSize: 13,
    color: colors.muted.foreground,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted.foreground,
  },
  sectionContent: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.card.DEFAULT,
  },
});
