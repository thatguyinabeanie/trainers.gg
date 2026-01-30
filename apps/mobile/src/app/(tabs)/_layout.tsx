import React from "react";
import { useColorScheme, Pressable, Text, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@/lib/theme";
import {
  ScrollVisibilityProvider,
  useScrollVisibilitySafe,
} from "@/components/navigation";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
};

function TabIcon({ name, color, focused: _focused }: TabIconProps) {
  return <Ionicons name={name} size={24} color={color} />;
}

const TAB_BAR_HEIGHT = 88;
const HEADER_CONTENT_HEIGHT = 44; // Only the content, not the safe area

// Extract the tabBar prop type from Tabs component
type TabBarProps = NonNullable<
  React.ComponentProps<typeof Tabs>["tabBar"]
> extends (props: infer P) => unknown
  ? P
  : never;

// Custom tab bar that supports scroll-based hide/show animation
function CustomTabBar(props: TabBarProps) {
  const { state, descriptors, navigation } = props;
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? darkColors : lightColors;
  const insets = useSafeAreaInsets();
  const scrollVisibility = useScrollVisibilitySafe();

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        scrollVisibility?.tabBarAnimatedStyle as object,
      ]}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;

        const { options } = descriptor;

        // Skip hidden tabs (settings)
        if ((options as { href?: string | null }).href === null) {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const color = isFocused
          ? colors.primary.DEFAULT
          : colors.muted.foreground;

        // Get the icon from options
        const tabBarIcon = options.tabBarIcon as
          | ((props: {
              focused: boolean;
              color: string;
              size: number;
            }) => React.ReactNode)
          | undefined;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              options.tabBarAccessibilityLabel as string | undefined
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            {tabBarIcon?.({
              focused: isFocused,
              color,
              size: 24,
            })}
            <Text style={[styles.tabLabel, { color }]}>
              {typeof label === "string" ? label : route.name}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? darkColors : lightColors;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.muted.foreground,
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.foreground,
          fontWeight: "600",
          fontSize: 17,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "compass" : "compass-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: null, // Hidden from tab bar - accessible via drawer
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "settings" : "settings-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ScrollVisibilityProvider
      headerHeight={HEADER_CONTENT_HEIGHT}
      tabBarHeight={TAB_BAR_HEIGHT}
    >
      <TabLayoutContent />
    </ScrollVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopColor: "transparent",
    borderTopWidth: 0,
    paddingTop: 8,
    height: TAB_BAR_HEIGHT,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});
