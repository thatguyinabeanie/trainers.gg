import React from "react";
import { ActivityIndicator } from "react-native";
import {
  Button as TamaguiButton,
  Text,
  useTheme,
  type GetProps,
} from "tamagui";

/**
 * Button component - minimal flat design with Tamagui theme support
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

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case "sm":
      return { height: 32, paddingHorizontal: 12, gap: 4, fontSize: 12 };
    case "lg":
      return { height: 48, paddingHorizontal: 24, gap: 8, fontSize: 16 };
    case "icon":
      return { height: 40, width: 40, padding: 0, fontSize: 14 };
    default:
      return { height: 40, paddingHorizontal: 16, gap: 6, fontSize: 14 };
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
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const sizeStyles = getSizeStyles(size);

  const getVariantProps = () => {
    switch (variant) {
      case "default":
        return {
          backgroundColor: "$primary",
          pressStyle: { opacity: 0.9 },
          textColor: "$primaryForeground",
        };
      case "secondary":
        return {
          backgroundColor: "$secondary",
          pressStyle: { opacity: 0.8 },
          textColor: "$secondaryForeground",
        };
      case "destructive":
        return {
          backgroundColor: "$destructive",
          pressStyle: { opacity: 0.9 },
          textColor: "$destructiveForeground",
        };
      case "outline":
        return {
          backgroundColor: "$background",
          borderWidth: 1,
          borderColor: "$borderColor",
          pressStyle: { backgroundColor: "$muted" },
          textColor: "$color",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          pressStyle: { backgroundColor: "$muted" },
          textColor: "$color",
        };
      case "link":
        return {
          backgroundColor: "transparent",
          pressStyle: { opacity: 0.7 },
          textColor: "$primary",
        };
    }
  };

  const variantProps = getVariantProps();
  const { textColor, ...buttonProps } = variantProps;

  const spinnerColor =
    variant === "default"
      ? String(theme.primaryForeground.get())
      : variant === "destructive"
        ? String(theme.destructiveForeground.get())
        : String(theme.primary.get());

  return (
    <TamaguiButton
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      borderRadius="$2"
      opacity={isDisabled ? 0.5 : 1}
      disabled={isDisabled}
      height={sizeStyles.height}
      paddingHorizontal={sizeStyles.paddingHorizontal}
      gap={sizeStyles.gap}
      {...buttonProps}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : typeof children === "string" ? (
        <Text
          fontSize={sizeStyles.fontSize}
          fontWeight="500"
          color={
            textColor as
              | "$primary"
              | "$color"
              | "$primaryForeground"
              | "$secondaryForeground"
              | "$destructiveForeground"
          }
          textDecorationLine={variant === "link" ? "underline" : "none"}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TamaguiButton>
  );
}
