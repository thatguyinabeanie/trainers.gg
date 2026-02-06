import "@/lib/polyfills";

import React from "react";
import { useColorScheme } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/supabase";
import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import tamaguiConfig from "@/tamagui.config";
import { lightColors, darkColors } from "@/lib/theme";
import { DrawerProvider } from "@/components/navigation";
import { queryClient } from "@/lib/query-client";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === "dark" ? "dark" : "light";
  const colors = themeName === "dark" ? darkColors : lightColors;

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={themeName}>
        <Theme name={themeName}>
          <AuthProvider>
            <DrawerProvider>
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
                  name="(auth)"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                  }}
                />
              </Stack>
            </DrawerProvider>
          </AuthProvider>
        </Theme>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
