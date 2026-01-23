import React from "react";
import { useColorScheme } from "react-native";
import { AuthProvider } from "@/lib/supabase";
import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import tamaguiConfig from "@/tamagui.config";
import { lightColors, darkColors } from "@/lib/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={colorScheme ?? "light"}
    >
      <Theme name={colorScheme ?? "light"}>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTintColor: colors.foreground,
              headerTitleStyle: {
                fontWeight: "600",
              },
              headerShadowVisible: false,
              contentStyle: {
                backgroundColor: colors.background,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(auth)/sign-in"
              options={{
                title: "Sign In",
                presentation: "modal",
                headerStyle: {
                  backgroundColor: colors.background,
                },
              }}
            />
            <Stack.Screen
              name="(auth)/sign-up"
              options={{
                title: "Sign Up",
                presentation: "modal",
                headerStyle: {
                  backgroundColor: colors.background,
                },
              }}
            />
          </Stack>
        </AuthProvider>
      </Theme>
    </TamaguiProvider>
  );
}
