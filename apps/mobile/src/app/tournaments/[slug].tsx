import { useLocalSearchParams, Stack } from "expo-router";
import { RefreshControl, ActivityIndicator } from "react-native";
import { useState } from "react";
import { YStack, XStack, Text, ScrollView, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { TeamPreview } from "@/components/tournament/team-preview";
import { useTournament, useTeamForRegistration, useAuth } from "@/lib/supabase";
import { checkRegistrationOpen, checkCheckInOpen } from "@trainers/supabase";

/**
 * Tournament detail screen.
 * Displays tournament info, registration count, and team submission status.
 * Accessible via /tournaments/[slug] route.
 */
export default function TournamentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { tournament, loading, error, refetch } = useTournament(slug);
  const {
    team,
    loading: teamLoading,
    refetch: refetchTeam,
  } = useTeamForRegistration(tournament?.id);
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchTeam()]);
    setRefreshing(false);
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "" }} />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={String(theme.primary.get())} />
        </YStack>
      </Screen>
    );
  }

  // Error / not found state
  if (error || !tournament) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Tournament" }} />
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$6"
          gap="$3"
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={String(theme.destructive.get())}
          />
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$color"
            textAlign="center"
          >
            Tournament not found
          </Text>
          <Text fontSize="$3" color="$mutedForeground" textAlign="center">
            The tournament you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </Text>
        </YStack>
      </Screen>
    );
  }

  // Derive display values
  const statusVariant = getStatusVariant(tournament.status);
  const formattedDate = tournament.start_date
    ? new Date(tournament.start_date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const formattedTime = tournament.start_date
    ? new Date(tournament.start_date).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const registrationCount = tournament.registrationCount;
  const isRegistered =
    isAuthenticated &&
    tournament.registrations.some(
      (r) => r.status === "registered" || r.status === "checked_in"
    );

  // Derive late registration / late check-in status
  const { isOpen: isRegistrationOpen, isLateRegistration } =
    checkRegistrationOpen(tournament);
  const { isOpen: _isCheckInOpen, isLateCheckIn } =
    checkCheckInOpen(tournament);

  return (
    <Screen>
      <Stack.Screen options={{ title: tournament.name }} />
      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={String(theme.primary.get())}
          />
        }
      >
        {/* Header */}
        <YStack padding="$5" gap="$4">
          {/* Status + Format badges */}
          <XStack gap="$2" flexWrap="wrap">
            {tournament.status && (
              <Badge variant={statusVariant}>
                {tournament.status === "active"
                  ? "LIVE"
                  : tournament.status.charAt(0).toUpperCase() +
                    tournament.status.slice(1)}
              </Badge>
            )}
            {isLateRegistration && (
              <Badge variant="outline">Late Registration</Badge>
            )}
            {isLateCheckIn && <Badge variant="outline">Late Check-In</Badge>}
            {tournament.format && (
              <Badge variant="secondary">{tournament.format}</Badge>
            )}
            {tournament.game && (
              <Badge variant="secondary">{tournament.game}</Badge>
            )}
          </XStack>

          {/* Tournament Name */}
          <Text fontSize="$8" fontWeight="700" color="$color">
            {tournament.name}
          </Text>

          {/* Organization */}
          {tournament.organization && (
            <XStack alignItems="center" gap="$2">
              <Ionicons
                name="business-outline"
                size={16}
                color={String(theme.mutedForeground.get())}
              />
              <Text fontSize="$3" color="$mutedForeground">
                {tournament.organization.name}
              </Text>
            </XStack>
          )}

          {/* Date / Time */}
          {formattedDate && (
            <XStack alignItems="center" gap="$2">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={String(theme.primary.get())}
              />
              <Text fontSize="$4" color="$color">
                {formattedDate}
                {formattedTime ? ` at ${formattedTime}` : ""}
              </Text>
            </XStack>
          )}

          {/* Stats Row */}
          <XStack gap="$6" marginTop="$2">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$primary">
                {registrationCount}
              </Text>
              <Text fontSize="$2" color="$mutedForeground">
                Registered
              </Text>
            </YStack>
            {tournament.max_participants && (
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$color">
                  {tournament.max_participants}
                </Text>
                <Text fontSize="$2" color="$mutedForeground">
                  Max Players
                </Text>
              </YStack>
            )}
            {tournament._count.phases > 0 && (
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$color">
                  {tournament._count.phases}
                </Text>
                <Text fontSize="$2" color="$mutedForeground">
                  Phases
                </Text>
              </YStack>
            )}
          </XStack>
        </YStack>

        {/* Description */}
        {tournament.description && (
          <YStack paddingHorizontal="$5" marginBottom="$4">
            <Text fontSize="$4" color="$color" lineHeight="$5">
              {tournament.description}
            </Text>
          </YStack>
        )}

        {/* Team Submission Section */}
        {isAuthenticated && team && (
          <YStack paddingHorizontal="$5" marginBottom="$4" gap="$3">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Your Team
            </Text>
            <Card>
              <CardHeader>
                <XStack alignItems="center" justifyContent="space-between">
                  <CardTitle>{team.teamName ?? "Submitted Team"}</CardTitle>
                  <Badge variant={team.locked ? "default" : "secondary"}>
                    {team.locked ? "Locked" : "Editable"}
                  </Badge>
                </XStack>
                {team.submittedAt && (
                  <Text fontSize="$2" color="$mutedForeground">
                    Submitted{" "}
                    {new Date(team.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                )}
              </CardHeader>
              <CardContent>
                <TeamPreview pokemon={team.pokemon} compact />
              </CardContent>
            </Card>
          </YStack>
        )}

        {/* Team loading indicator */}
        {isAuthenticated && teamLoading && !team && (
          <YStack
            paddingHorizontal="$5"
            marginBottom="$4"
            alignItems="center"
            padding="$4"
          >
            <ActivityIndicator
              size="small"
              color={String(theme.primary.get())}
            />
          </YStack>
        )}

        {/* Tournament Details Section */}
        <YStack paddingHorizontal="$5" gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Details
          </Text>
          <Card>
            <CardContent paddingTop="$4">
              <YStack gap="$3">
                {tournament.tournament_format && (
                  <DetailRow
                    icon="trophy-outline"
                    label="Tournament Format"
                    value={formatTournamentFormat(tournament.tournament_format)}
                    theme={theme}
                  />
                )}
                {tournament.battle_format && (
                  <DetailRow
                    icon="game-controller-outline"
                    label="Battle Format"
                    value={tournament.battle_format}
                    theme={theme}
                  />
                )}
                {tournament.platform && (
                  <DetailRow
                    icon="desktop-outline"
                    label="Platform"
                    value={tournament.platform}
                    theme={theme}
                  />
                )}
                {tournament.round_time_minutes && (
                  <DetailRow
                    icon="time-outline"
                    label="Round Time"
                    value={`${tournament.round_time_minutes} minutes`}
                    theme={theme}
                  />
                )}
                {tournament.swiss_rounds && (
                  <DetailRow
                    icon="layers-outline"
                    label="Swiss Rounds"
                    value={String(tournament.swiss_rounds)}
                    theme={theme}
                  />
                )}
                {tournament.top_cut_size && (
                  <DetailRow
                    icon="podium-outline"
                    label="Top Cut"
                    value={`Top ${tournament.top_cut_size}`}
                    theme={theme}
                  />
                )}
                {tournament.prize_pool && (
                  <DetailRow
                    icon="cash-outline"
                    label="Prize Pool"
                    value={tournament.prize_pool}
                    theme={theme}
                  />
                )}
                {tournament.check_in_required && (
                  <DetailRow
                    icon="checkmark-circle-outline"
                    label="Check-in"
                    value={`Required (${tournament.check_in_window_minutes ?? 60} min window)`}
                    theme={theme}
                  />
                )}
                {tournament.open_team_sheets !== null &&
                  tournament.open_team_sheets !== undefined && (
                    <DetailRow
                      icon="document-text-outline"
                      label="Team Sheets"
                      value={tournament.open_team_sheets ? "Open" : "Closed"}
                      theme={theme}
                    />
                  )}
              </YStack>
            </CardContent>
          </Card>
        </YStack>

        {/* Late check-in notice (registered but not checked in) */}
        {isAuthenticated && isRegistered && isLateCheckIn && (
          <YStack paddingHorizontal="$5" marginTop="$4">
            <Card>
              <CardContent paddingVertical="$5" alignItems="center" gap="$2">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={32}
                  color={String(theme.primary.get())}
                />
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color="$color"
                  textAlign="center"
                >
                  Late Check-In Available
                </Text>
                <Text fontSize="$3" color="$mutedForeground" textAlign="center">
                  The tournament has started. You can still check in and join
                  from the next round.
                </Text>
              </CardContent>
            </Card>
          </YStack>
        )}

        {/* Registration Status (if not registered) */}
        {isAuthenticated && !isRegistered && !teamLoading && (
          <YStack paddingHorizontal="$5" marginTop="$4">
            <Card>
              <CardContent paddingVertical="$5" alignItems="center" gap="$2">
                <Ionicons
                  name="person-add-outline"
                  size={32}
                  color={
                    isLateRegistration
                      ? String(theme.primary.get())
                      : String(theme.mutedForeground.get())
                  }
                />
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color="$color"
                  textAlign="center"
                >
                  {isLateRegistration
                    ? "Late Registration Open"
                    : "Not registered"}
                </Text>
                <Text fontSize="$3" color="$mutedForeground" textAlign="center">
                  {isLateRegistration
                    ? "This tournament is in progress and accepting late registrations."
                    : isRegistrationOpen
                      ? "You are not currently registered for this tournament."
                      : "Registration is closed for this tournament."}
                </Text>
              </CardContent>
            </Card>
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}

// --- Helper Components ---

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}

function DetailRow({ icon, label, value, theme }: DetailRowProps) {
  return (
    <XStack alignItems="center" gap="$3">
      <Ionicons
        name={icon}
        size={18}
        color={String(theme.mutedForeground.get())}
      />
      <YStack flex={1}>
        <Text fontSize="$2" color="$mutedForeground">
          {label}
        </Text>
        <Text fontSize="$3" fontWeight="500" color="$color">
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}

// --- Helper Functions ---

function getStatusVariant(
  status: string | null
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "active":
      return "destructive";
    case "upcoming":
      return "default";
    case "completed":
      return "secondary";
    default:
      return "secondary";
  }
}

function formatTournamentFormat(format: string): string {
  // Convert snake_case or camelCase to human-readable
  return format
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
