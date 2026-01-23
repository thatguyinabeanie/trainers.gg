import React from "react";
import { ActivityIndicator, Text, StyleSheet } from "react-native";
import { Button as TamaguiButton, type GetProps } from "tamagui";
import { colors } from "@/lib/theme";

/**
 * Button component matching shadcn/ui design language
 * Built on Tamagui primitives
 */

type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends Omit<
  GetProps<typeof TamaguiButton>,
  "size" | "variant"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case "default":
      return {
        backgroundColor: colors.primary.DEFAULT,
        pressStyle: { opacity: 0.9 },
      };
    case "secondary":
      return {
        backgroundColor: colors.secondary.DEFAULT,
        pressStyle: { opacity: 0.8 },
      };
    case "destructive":
      return {
        backgroundColor: colors.destructive.DEFAULT + "1A", // 10% opacity
        pressStyle: { backgroundColor: colors.destructive.DEFAULT + "33" }, // 20% opacity
      };
    case "outline":
      return {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        pressStyle: { backgroundColor: colors.muted.DEFAULT },
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        pressStyle: { backgroundColor: colors.muted.DEFAULT },
      };
    case "link":
      return {
        backgroundColor: "transparent",
        pressStyle: { opacity: 0.7 },
      };
  }
};

const getTextColor = (variant: ButtonVariant) => {
  switch (variant) {
    case "default":
      return colors.primary.foreground;
    case "secondary":
      return colors.secondary.foreground;
    case "destructive":
      return colors.destructive.DEFAULT;
    case "outline":
    case "ghost":
      return colors.foreground;
    case "link":
      return colors.primary.DEFAULT;
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case "sm":
      return { height: 32, paddingHorizontal: 12, gap: 4 };
    case "lg":
      return { height: 48, paddingHorizontal: 24, gap: 8 };
    case "icon":
      return { height: 40, width: 40, padding: 0 };
    default:
      return { height: 40, paddingHorizontal: 16, gap: 6 };
  }
};

const getTextSize = (size: ButtonSize) => {
  switch (size) {
    case "sm":
      return 12;
    case "lg":
      return 16;
    default:
      return 14;
  }
};

export function Button({
  children,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const textColor = getTextColor(variant);
  const textSize = getTextSize(size);

  const spinnerColor =
    variant === "default"
      ? colors.primary.foreground
      : variant === "destructive"
        ? colors.destructive.DEFAULT
        : colors.primary.DEFAULT;

  return (
    <TamaguiButton
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      borderRadius={8}
      opacity={isDisabled ? 0.5 : 1}
      disabled={isDisabled}
      {...variantStyles}
      {...sizeStyles}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : typeof children === "string" ? (
        <Text
          style={[
            styles.text,
            {
              color: textColor,
              fontSize: textSize,
              textDecorationLine: variant === "link" ? "underline" : "none",
            },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TamaguiButton>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: "500",
  },
});
