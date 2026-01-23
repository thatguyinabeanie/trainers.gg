import { useState } from "react";
import {
  View,
  TextInput,
  type TextInputProps,
  Text,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { colors } from "@/lib/theme";

/**
 * Input component - minimal flat design
 */

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.muted.foreground + "80"}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.muted.DEFAULT,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.foreground,
  },
  inputFocused: {
    backgroundColor: colors.muted.DEFAULT + "CC",
  },
  inputError: {
    backgroundColor: colors.destructive.DEFAULT + "1A",
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: colors.destructive.DEFAULT,
  },
});
