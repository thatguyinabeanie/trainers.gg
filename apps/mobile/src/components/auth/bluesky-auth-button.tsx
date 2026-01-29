import { useState } from "react";
import { Modal, Pressable } from "react-native";
import { YStack, XStack, Text, Input, Button, Spinner } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "tamagui";

interface BlueskyAuthButtonProps {
  onSignIn: (handle: string) => Promise<{ error: Error | null }>;
  label?: string;
  loading?: boolean;
}

export function BlueskyAuthButton({
  onSignIn,
  label = "Sign in with Bluesky",
  loading: externalLoading,
}: BlueskyAuthButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const isLoading = loading || externalLoading;

  const handleSubmit = async () => {
    setError(null);

    const trimmed = handle.trim();
    if (!trimmed) {
      setError("Please enter your Bluesky handle");
      return;
    }

    // Basic handle validation — must contain a dot (e.g., user.bsky.social)
    if (!trimmed.includes(".")) {
      setError("Enter your full handle (e.g., username.bsky.social)");
      return;
    }

    setLoading(true);
    const { error: signInError } = await onSignIn(trimmed);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setShowModal(false);
      setHandle("");
    }
  };

  return (
    <>
      <Button
        backgroundColor="$muted"
        borderWidth={0}
        borderRadius="$4"
        height={52}
        pressStyle={{ opacity: 0.85 }}
        opacity={isLoading ? 0.7 : 1}
        disabled={isLoading}
        onPress={() => setShowModal(true)}
      >
        <XStack alignItems="center" gap="$2">
          <Ionicons name="at-outline" size={20} color={theme.primary.val} />
          <Text color="$color" fontSize={16} fontWeight="600">
            {label}
          </Text>
        </XStack>
      </Button>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end" }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="$background"
              borderTopLeftRadius="$6"
              borderTopRightRadius="$6"
              padding="$6"
              gap="$4"
              paddingBottom="$8"
            >
              <YStack alignItems="center" gap="$2">
                <Text fontSize={20} fontWeight="700" color="$color">
                  Sign in with Bluesky
                </Text>
                <Text fontSize={14} color="$mutedForeground" textAlign="center">
                  Enter your Bluesky handle to continue
                </Text>
              </YStack>

              {error && (
                <YStack backgroundColor="$red3" borderRadius="$4" padding="$3">
                  <Text color="$red10" textAlign="center" fontSize={14}>
                    {error}
                  </Text>
                </YStack>
              )}

              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="username.bsky.social"
                placeholderTextColor="$mutedForeground"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <Button
                backgroundColor="$primary"
                borderWidth={0}
                borderRadius="$4"
                height={52}
                pressStyle={{ opacity: 0.85 }}
                opacity={isLoading ? 0.7 : 1}
                disabled={isLoading}
                onPress={handleSubmit}
              >
                {isLoading ? (
                  <Spinner color="$primaryForeground" />
                ) : (
                  <Text
                    color="$primaryForeground"
                    fontSize={16}
                    fontWeight="600"
                  >
                    Continue
                  </Text>
                )}
              </Button>

              <Button
                backgroundColor="transparent"
                borderWidth={0}
                onPress={() => setShowModal(false)}
                disabled={isLoading}
              >
                <Text color="$mutedForeground" fontSize={14}>
                  Cancel
                </Text>
              </Button>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
