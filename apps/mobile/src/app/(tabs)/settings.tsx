import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { YStack, XStack, Text, ScrollView } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, getUserDisplayName, useSiteRoles } from "@/lib/supabase";
import { Screen, Avatar, Badge, Button } from "@/components/ui";
import Constants from "expo-constants";

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  destructive?: boolean;
  onPress?: () => void;
}

function SettingsItem({
  title,
  subtitle,
  icon,
  rightText,
  destructive,
  onPress,
}: SettingsItemProps) {
  return (
    <XStack
      paddingVertical="$3"
      paddingHorizontal="$4"
      alignItems="center"
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
    >
      <XStack
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$muted"
        borderRadius="$3"
        marginRight="$3"
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? "#ef4444" : "#71717a"}
        />
      </XStack>
      <YStack flex={1}>
        <Text
          fontSize={15}
          color={destructive ? "$destructive" : "$color"}
          fontWeight="500"
        >
          {title}
        </Text>
        {subtitle && (
          <Text fontSize={13} color="$mutedForeground" marginTop="$0.5">
            {subtitle}
          </Text>
        )}
      </YStack>
      {rightText && (
        <Text fontSize={13} color="$mutedForeground">
          {rightText}
        </Text>
      )}
    </XStack>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <YStack marginTop="$6">
      <Text
        fontSize={12}
        fontWeight="600"
        color="$mutedForeground"
        textTransform="uppercase"
        letterSpacing={0.5}
        paddingHorizontal="$4"
        marginBottom="$2"
      >
        {title}
      </Text>
      <YStack backgroundColor="$card" borderRadius="$4">
        {children}
      </YStack>
    </YStack>
  );
}

export default function SettingsScreen() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const { siteRoles } = useSiteRoles();
  const router = useRouter();

  const displayName = getUserDisplayName(user);
  const username = user?.user_metadata?.username as string | undefined;

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen>
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* User Profile Section */}
        {isAuthenticated ? (
          <XStack
            backgroundColor="$card"
            paddingHorizontal="$4"
            paddingVertical="$5"
            marginTop="$4"
            marginHorizontal="$4"
            borderRadius="$4"
            alignItems="center"
          >
            <Avatar size="lg" fallback={displayName} />
            <YStack marginLeft="$4" flex={1}>
              <Text fontSize={18} fontWeight="600" color="$color">
                {displayName}
              </Text>
              {username && (
                <Text fontSize={14} color="$mutedForeground" marginTop="$0.5">
                  @{username}
                </Text>
              )}
              <Text fontSize={13} color="$mutedForeground" opacity={0.7}>
                {user?.email}
              </Text>
            </YStack>
            {siteRoles.length > 0 && (
              <Badge variant="default">{siteRoles[0]}</Badge>
            )}
          </XStack>
        ) : (
          <YStack
            backgroundColor="$card"
            marginTop="$4"
            marginHorizontal="$4"
            borderRadius="$4"
            paddingHorizontal="$4"
            paddingVertical="$6"
          >
            <Text
              fontSize={15}
              color="$mutedForeground"
              textAlign="center"
              marginBottom="$4"
            >
              Sign in to access all features
            </Text>
            <Button
              onPress={() => router.push("/(auth)/sign-in" as never)}
              marginBottom="$2"
            >
              Sign In
            </Button>
            <Button
              variant="ghost"
              onPress={() => router.push("/(auth)/sign-up" as never)}
            >
              Create Account
            </Button>
          </YStack>
        )}

        {/* Horizontal padding wrapper for sections */}
        <YStack paddingHorizontal="$4">
          {/* Account Settings */}
          {isAuthenticated && (
            <SettingsSection title="Account">
              <SettingsItem title="Edit Profile" icon="person-outline" />
              <SettingsItem title="Change Email" icon="mail-outline" />
              <SettingsItem
                title="Change Password"
                icon="lock-closed-outline"
              />
              <SettingsItem
                title="Two-Factor Auth"
                icon="shield-checkmark-outline"
                rightText="Off"
              />
            </SettingsSection>
          )}

          {/* Notifications */}
          <SettingsSection title="Notifications">
            <SettingsItem
              title="Push Notifications"
              icon="notifications-outline"
              rightText="On"
            />
            <SettingsItem
              title="Email Notifications"
              icon="mail-outline"
              rightText="On"
            />
            <SettingsItem
              title="Tournament Reminders"
              icon="alarm-outline"
              rightText="On"
            />
          </SettingsSection>

          {/* Preferences */}
          <SettingsSection title="Preferences">
            <SettingsItem
              title="Appearance"
              subtitle="System default"
              icon="moon-outline"
            />
            <SettingsItem
              title="Language"
              subtitle="English"
              icon="language-outline"
            />
            <SettingsItem
              title="Default Format"
              subtitle="VGC 2026"
              icon="game-controller-outline"
            />
          </SettingsSection>

          {/* Support */}
          <SettingsSection title="Support">
            <SettingsItem title="Help Center" icon="help-circle-outline" />
            <SettingsItem title="Report a Problem" icon="bug-outline" />
            <SettingsItem title="Privacy Policy" icon="document-text-outline" />
            <SettingsItem title="Terms of Service" icon="document-outline" />
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About">
            <SettingsItem
              title="Version"
              icon="information-circle-outline"
              rightText={Constants.expoConfig?.version ?? "1.0.0"}
            />
            <SettingsItem title="Rate the App" icon="star-outline" />
            <SettingsItem
              title="Share trainers.gg"
              icon="share-social-outline"
            />
          </SettingsSection>

          {/* Sign Out */}
          {isAuthenticated && (
            <YStack marginTop="$6">
              <YStack backgroundColor="$card" borderRadius="$4">
                <SettingsItem
                  title="Sign Out"
                  icon="log-out-outline"
                  destructive
                  onPress={handleSignOut}
                />
              </YStack>
            </YStack>
          )}
        </YStack>

        {/* Footer */}
        <YStack marginTop="$8" alignItems="center" paddingHorizontal="$4">
          <Text fontSize={12} color="$mutedForeground" opacity={0.6}>
            trainers.gg v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
          <Text
            marginTop="$1"
            fontSize={12}
            color="$mutedForeground"
            opacity={0.6}
          >
            Made with love for the Pokemon community
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
