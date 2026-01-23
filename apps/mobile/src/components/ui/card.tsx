import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

/**
 * Card components - minimal flat design
 */

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

interface CardTitleProps {
  children: React.ReactNode;
}

export function CardTitle({ children }: CardTitleProps) {
  return <Text style={styles.title}>{children}</Text>;
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

export function CardDescription({ children }: CardDescriptionProps) {
  return <Text style={styles.description}>{children}</Text>;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.card.DEFAULT,
  },
  header: {
    gap: 6,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.card.foreground,
  },
  description: {
    fontSize: 14,
    color: colors.muted.foreground,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.muted.DEFAULT + "40",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
