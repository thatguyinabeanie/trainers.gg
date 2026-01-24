import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/lib/supabase";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.85;

interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

interface DrawerMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  label: string;
  href: string;
  badge?: number;
}

const MENU_ITEMS: DrawerMenuItem[] = [
  {
    icon: "person-outline",
    iconFilled: "person",
    label: "Profile",
    href: "/(tabs)/profile",
  },
  {
    icon: "bookmark-outline",
    iconFilled: "bookmark",
    label: "Bookmarks",
    href: "/(tabs)/home", // placeholder
  },
  {
    icon: "list-outline",
    iconFilled: "list",
    label: "Lists",
    href: "/(tabs)/home", // placeholder
  },
  {
    icon: "business-outline",
    iconFilled: "business",
    label: "Organizations",
    href: "/(tabs)/explore",
  },
  {
    icon: "trophy-outline",
    iconFilled: "trophy",
    label: "Tournaments",
    href: "/(tabs)/explore",
  },
];

const FOOTER_ITEMS: DrawerMenuItem[] = [
  {
    icon: "settings-outline",
    iconFilled: "settings",
    label: "Settings & Privacy",
    href: "/(tabs)/settings",
  },
];

function DrawerContent({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();

  const handleNavigation = (href: string) => {
    onClose();
    // Small delay to let drawer close animation start
    setTimeout(() => {
      router.push(href as never);
    }, 100);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      {/* Header - User Info */}
      <YStack paddingHorizontal="$4" paddingVertical="$4" gap="$3">
        {isAuthenticated ? (
          <>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <Avatar size="lg" fallback={user?.email || "U"} />
              <Pressable
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: String(theme.borderColor.get()),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={String(theme.color.get())}
                />
              </Pressable>
            </XStack>
            <YStack gap="$0.5">
              <Text fontSize="$5" fontWeight="700" color="$color">
                {user?.user_metadata?.username || "User"}
              </Text>
              <Text fontSize="$3" color="$mutedForeground">
                @{user?.user_metadata?.username || user?.email?.split("@")[0]}
              </Text>
            </YStack>
            <XStack gap="$4">
              <Pressable>
                <XStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color="$color">
                    0
                  </Text>
                  <Text fontSize="$3" color="$mutedForeground">
                    Following
                  </Text>
                </XStack>
              </Pressable>
              <Pressable>
                <XStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color="$color">
                    0
                  </Text>
                  <Text fontSize="$3" color="$mutedForeground">
                    Followers
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </>
        ) : (
          <YStack gap="$3">
            <Text fontSize="$6" fontWeight="700" color="$color">
              trainers.gg
            </Text>
            <Text fontSize="$3" color="$mutedForeground">
              Sign in to access all features
            </Text>
          </YStack>
        )}
      </YStack>

      {/* Divider */}
      <YStack height={1} backgroundColor="$borderColor" />

      {/* Menu Items */}
      <YStack flex={1} paddingTop="$2">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => handleNavigation(item.href)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <XStack
              paddingHorizontal="$5"
              paddingVertical="$4"
              alignItems="center"
              gap="$4"
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={String(theme.color.get())}
              />
              <Text fontSize="$5" fontWeight="500" color="$color">
                {item.label}
              </Text>
              {item.badge !== undefined && item.badge > 0 && (
                <YStack
                  backgroundColor="$primary"
                  borderRadius={10}
                  paddingHorizontal="$2"
                  paddingVertical="$0.5"
                >
                  <Text
                    fontSize="$2"
                    fontWeight="600"
                    color="$primaryForeground"
                  >
                    {item.badge}
                  </Text>
                </YStack>
              )}
            </XStack>
          </Pressable>
        ))}
      </YStack>

      {/* Divider */}
      <YStack height={1} backgroundColor="$borderColor" />

      {/* Footer Items */}
      <YStack paddingVertical="$2">
        {FOOTER_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => handleNavigation(item.href)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <XStack
              paddingHorizontal="$5"
              paddingVertical="$4"
              alignItems="center"
              gap="$4"
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={String(theme.color.get())}
              />
              <Text fontSize="$5" fontWeight="500" color="$color">
                {item.label}
              </Text>
            </XStack>
          </Pressable>
        ))}

        {isAuthenticated && (
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <XStack
              paddingHorizontal="$5"
              paddingVertical="$4"
              alignItems="center"
              gap="$4"
            >
              <Ionicons
                name="log-out-outline"
                size={24}
                color={String(theme.destructive.get())}
              />
              <Text fontSize="$5" fontWeight="500" color="$destructive">
                Sign Out
              </Text>
            </XStack>
          </Pressable>
        )}

        {!isAuthenticated && (
          <Pressable
            onPress={() => handleNavigation("/(auth)/sign-in")}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <XStack
              paddingHorizontal="$5"
              paddingVertical="$4"
              alignItems="center"
              gap="$4"
            >
              <Ionicons
                name="log-in-outline"
                size={24}
                color={String(theme.primary.get())}
              />
              <Text fontSize="$5" fontWeight="500" color="$primary">
                Sign In
              </Text>
            </XStack>
          </Pressable>
        )}
      </YStack>
    </YStack>
  );
}

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [fadeAnim] = useState(new Animated.Value(0));
  const theme = useTheme();

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  }, [slideAnim, fadeAnim]);

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isOpen, openDrawer, closeDrawer]);

  return (
    <DrawerContext.Provider
      value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}
    >
      {children}

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              opacity: fadeAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            backgroundColor: String(theme.background.get()),
            shadowColor: "#000",
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <DrawerContent onClose={closeDrawer} />
        </Animated.View>
      </Modal>
    </DrawerContext.Provider>
  );
}
