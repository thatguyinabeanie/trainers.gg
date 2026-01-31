import React, { useState, useCallback, useEffect } from "react";
import { Alert, TextInput, Platform } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamPreview } from "./team-preview";
import { getSupabase } from "@/lib/supabase/client";
import { submitTeam } from "@trainers/supabase/mutations";
import {
  parseAndValidateTeam,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  type ValidationResult,
} from "@trainers/validators/team";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamSubmissionCardProps {
  tournamentId: number;
  gameFormat: string | null;
  submittedTeam: {
    teamId: number;
    submittedAt: string | null;
    locked: boolean;
    pokemon: Array<{
      species: string;
      nickname?: string | null;
      held_item?: string | null;
      ability?: string;
      tera_type?: string | null;
    }>;
  } | null;
  onTeamSubmitted?: () => void;
}

type CardState = "empty" | "editing" | "submitted";
type InputMode = "paste" | "url";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeamSubmissionCard({
  tournamentId,
  gameFormat,
  submittedTeam,
  onTeamSubmitted,
}: TeamSubmissionCardProps) {
  // Determine initial state based on whether a team is already submitted
  const [cardState, setCardState] = useState<CardState>(
    submittedTeam ? "submitted" : "empty"
  );
  const [inputMode, setInputMode] = useState<InputMode>("paste");

  // Paste mode state
  const [rawText, setRawText] = useState("");

  // URL mode state
  const [pokepasteUrl, setPokepasteUrl] = useState("");
  const [isFetchingPaste, setIsFetchingPaste] = useState(false);

  // Validation state
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Live validation as user types (debounced)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (cardState !== "editing" || !rawText.trim()) {
      setValidation(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = parseAndValidateTeam(rawText, gameFormat ?? "");
      setValidation(result);
    }, 400);

    return () => clearTimeout(timer);
  }, [rawText, gameFormat, cardState]);

  // ---------------------------------------------------------------------------
  // Pokepaste fetch
  // ---------------------------------------------------------------------------

  const handleFetchPokepaste = useCallback(async () => {
    const parsed = parsePokepaseUrl(pokepasteUrl);
    if (!parsed) {
      Alert.alert(
        "Invalid URL",
        "Please enter a valid pokepast.es URL (e.g. https://pokepast.es/abc123)"
      );
      return;
    }

    setIsFetchingPaste(true);
    try {
      const rawUrl = getPokepaseRawUrl(parsed.pasteId);
      const response = await fetch(rawUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch paste (HTTP ${response.status})`);
      }

      const text = await response.text();
      // Switch to paste mode and populate the textarea with the fetched text
      setRawText(text);
      setInputMode("paste");
    } catch (error) {
      Alert.alert(
        "Fetch Failed",
        error instanceof Error ? error.message : "Could not load paste data"
      );
    } finally {
      setIsFetchingPaste(false);
    }
  }, [pokepasteUrl]);

  // ---------------------------------------------------------------------------
  // Submit team
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (!validation?.valid) return;

    setIsSubmitting(true);
    try {
      const supabase = getSupabase();
      const result = await submitTeam(supabase, tournamentId, rawText);

      if (result.success) {
        Alert.alert(
          "Team Submitted",
          `${result.pokemonCount} Pokemon saved successfully`
        );
        setCardState("submitted");
        onTeamSubmitted?.();
      }
    } catch (error) {
      Alert.alert(
        "Submission Failed",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [tournamentId, rawText, validation, onTeamSubmitted]);

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  const startEditing = useCallback((mode: InputMode) => {
    setInputMode(mode);
    setRawText("");
    setPokepasteUrl("");
    setValidation(null);
    setCardState("editing");
  }, []);

  const cancelEditing = useCallback(() => {
    setRawText("");
    setPokepasteUrl("");
    setValidation(null);
    setCardState(submittedTeam ? "submitted" : "empty");
  }, [submittedTeam]);

  // ---------------------------------------------------------------------------
  // Render: Empty state
  // ---------------------------------------------------------------------------

  if (cardState === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Submission</CardTitle>
          <CardDescription>
            Submit your team before you can check in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <XStack gap="$3">
            <Button
              variant="outline"
              onPress={() => startEditing("paste")}
              flex={1}
            >
              Paste Team
            </Button>
            <Button
              variant="outline"
              onPress={() => startEditing("url")}
              flex={1}
            >
              Import Pokepaste
            </Button>
          </XStack>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Editing state
  // ---------------------------------------------------------------------------

  if (cardState === "editing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Submission</CardTitle>
          <CardDescription>
            Paste your team in Showdown format or import from Pokepaste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <YStack gap="$3">
            {/* Mode toggle */}
            <XStack gap="$2">
              <Button
                variant={inputMode === "paste" ? "default" : "outline"}
                size="sm"
                onPress={() => setInputMode("paste")}
              >
                Paste
              </Button>
              <Button
                variant={inputMode === "url" ? "default" : "outline"}
                size="sm"
                onPress={() => setInputMode("url")}
              >
                Pokepaste URL
              </Button>
            </XStack>

            {/* Input area */}
            {inputMode === "paste" ? (
              <YStack
                backgroundColor="$muted"
                borderRadius="$4"
                padding="$3"
                minHeight={200}
              >
                <TextInput
                  multiline
                  placeholder={
                    "Paste your team in Showdown export format...\n\n" +
                    "Example:\n" +
                    "Koraidon @ Booster Energy\n" +
                    "Ability: Orichalcum Pulse\n" +
                    "Tera Type: Fire\n" +
                    "EVs: 4 HP / 252 Atk / 252 Spe\n" +
                    "Jolly Nature\n" +
                    "- Flame Charge\n" +
                    "- Collision Course"
                  }
                  value={rawText}
                  onChangeText={setRawText}
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    fontSize: 12,
                    lineHeight: 18,
                    minHeight: 180,
                    textAlignVertical: "top",
                    color: "inherit",
                  }}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </YStack>
            ) : (
              <XStack gap="$2" alignItems="flex-start">
                <YStack flex={1}>
                  <Input
                    placeholder="https://pokepast.es/abc123..."
                    value={pokepasteUrl}
                    onChangeText={setPokepasteUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </YStack>
                <Button
                  onPress={handleFetchPokepaste}
                  disabled={!pokepasteUrl.trim() || isFetchingPaste}
                  loading={isFetchingPaste}
                >
                  Fetch
                </Button>
              </XStack>
            )}

            {/* Validation errors */}
            {validation &&
              !validation.valid &&
              validation.errors.length > 0 && (
                <YStack
                  backgroundColor="$destructive"
                  opacity={0.1}
                  borderRadius="$3"
                />
              )}
            {validation &&
              !validation.valid &&
              validation.errors.length > 0 && (
                <YStack
                  backgroundColor="$backgroundStrong"
                  borderRadius="$3"
                  padding="$3"
                  gap="$1"
                >
                  {validation.errors.map((err, i) => (
                    <Text
                      key={i}
                      fontSize="$2"
                      color="$destructive"
                      lineHeight="$2"
                    >
                      {"\u2022"} {err.message}
                    </Text>
                  ))}
                </YStack>
              )}

            {/* Team preview (shown when we have parsed Pokemon) */}
            {validation && validation.team.length > 0 && (
              <YStack gap="$2">
                <Text fontSize="$2" fontWeight="500" color="$mutedForeground">
                  Preview ({validation.team.length} Pokemon)
                </Text>
                <TeamPreview
                  pokemon={validation.team.map((mon) => ({
                    species: mon.species,
                    nickname: mon.nickname,
                    held_item: mon.held_item,
                    ability: mon.ability,
                    tera_type: mon.tera_type,
                  }))}
                  compact
                />
              </YStack>
            )}

            {/* Action buttons */}
            <XStack gap="$3">
              <Button
                variant="outline"
                onPress={cancelEditing}
                disabled={isSubmitting}
                flex={1}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={!validation?.valid || isSubmitting}
                loading={isSubmitting}
                flex={1}
              >
                Submit Team
              </Button>
            </XStack>
          </YStack>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Submitted state
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1" flex={1}>
            <XStack gap="$2" alignItems="center">
              {/* Green circle indicator */}
              <YStack
                width={10}
                height={10}
                borderRadius={5}
                backgroundColor="$green9"
              />
              <CardTitle>Team Submitted</CardTitle>
            </XStack>
            <CardDescription>
              {submittedTeam?.submittedAt
                ? `Submitted ${new Date(submittedTeam.submittedAt).toLocaleString()}`
                : "Your team has been submitted"}
            </CardDescription>
          </YStack>

          {/* Locked badge */}
          {submittedTeam?.locked && (
            <YStack
              backgroundColor="$muted"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$2" fontWeight="500" color="$mutedForeground">
                Locked
              </Text>
            </YStack>
          )}
        </XStack>
      </CardHeader>
      <CardContent>
        <YStack gap="$3">
          {/* Show the submitted team */}
          {submittedTeam && submittedTeam.pokemon.length > 0 && (
            <TeamPreview pokemon={submittedTeam.pokemon} />
          )}

          {/* Replace button (disabled when locked) */}
          <Button
            variant="outline"
            onPress={() => startEditing("paste")}
            disabled={submittedTeam?.locked}
          >
            {submittedTeam?.locked ? "Team Locked" : "Replace Team"}
          </Button>
        </YStack>
      </CardContent>
    </Card>
  );
}
