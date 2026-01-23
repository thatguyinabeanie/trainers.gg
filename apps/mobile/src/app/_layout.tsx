import { AuthProvider } from "@/lib/supabase";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1b9388", // teal primary
          },
          headerTintColor: "#f2fbf9", // primaryForeground
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: "trainers.gg" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/sign-in"
          options={{ title: "Sign In", presentation: "modal" }}
        />
        <Stack.Screen
          name="(auth)/sign-up"
          options={{ title: "Sign Up", presentation: "modal" }}
        />
      </Stack>
    </AuthProvider>
  );
}
