import { type ViewStyle } from "react-native";
import {
  YStack,
  Text,
  Input as TamaguiInput,
  type InputProps as TamaguiInputProps,
} from "tamagui";

/**
 * Input component - minimal flat design with Tamagui
 */

interface InputProps extends Omit<TamaguiInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, ...props }: InputProps) {
  return (
    <YStack width="100%" style={containerStyle}>
      {label && (
        <Text marginBottom="$2" fontSize="$3" fontWeight="500" color="$color">
          {label}
        </Text>
      )}

      <TamaguiInput
        height={48}
        borderRadius="$4"
        backgroundColor={error ? "$destructiveMuted" : "$muted"}
        paddingHorizontal="$4"
        fontSize="$4"
        color="$color"
        borderWidth={0}
        placeholderTextColor="$mutedForeground"
        focusStyle={{
          backgroundColor: "$muted",
          opacity: 0.8,
        }}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        {...props}
      />

      {error && (
        <Text marginTop="$1.5" fontSize="$2" color="$destructive">
          {error}
        </Text>
      )}
    </YStack>
  );
}
