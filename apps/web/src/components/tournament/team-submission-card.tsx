"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardPaste,
  Link,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { submitTeamAction } from "@/actions/tournaments";
import {
  parseAndValidateTeam,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  type ValidationResult,
} from "@trainers/validators/team";
import { TeamPreview } from "./team-preview";

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
  // Live validation as user types
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (cardState !== "editing" || !rawText.trim()) {
      setValidation(null);
      return;
    }

    // Debounce validation slightly to avoid running on every keystroke
    const timer = setTimeout(() => {
      const result = parseAndValidateTeam(rawText, gameFormat ?? "");
      setValidation(result);
    }, 300);

    return () => clearTimeout(timer);
  }, [rawText, gameFormat, cardState]);

  // ---------------------------------------------------------------------------
  // Pokepaste fetch
  // ---------------------------------------------------------------------------

  const handleFetchPokepaste = useCallback(async () => {
    const parsed = parsePokepaseUrl(pokepasteUrl);
    if (!parsed) {
      toast.error("Invalid Pokepaste URL", {
        description:
          "Please enter a valid pokepast.es URL (e.g. https://pokepast.es/abc123)",
      });
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

      toast.success("Pokepaste imported", {
        description: "Team data has been loaded into the editor",
      });
    } catch (error) {
      toast.error("Failed to fetch Pokepaste", {
        description:
          error instanceof Error ? error.message : "Could not load paste data",
      });
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
      const result = await submitTeamAction(tournamentId, rawText);

      if (result.success) {
        toast.success("Team submitted", {
          description: `${result.data.pokemonCount} Pokemon saved successfully`,
        });
        setCardState("submitted");
        onTeamSubmitted?.();
      } else {
        toast.error("Submission failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Submission failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [tournamentId, rawText, validation, onTeamSubmitted]);

  // ---------------------------------------------------------------------------
  // Transition to editing state
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
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Team Submission
          </CardTitle>
          <CardDescription>
            Submit your team before you can check in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => startEditing("paste")}
              className="flex-1"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste Team
            </Button>
            <Button
              variant="outline"
              onClick={() => startEditing("url")}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              Import Pokepaste
            </Button>
          </div>
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
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Team Submission
          </CardTitle>
          <CardDescription>
            Paste your team in Showdown format or import from Pokepaste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("paste")}
            >
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
              Paste
            </Button>
            <Button
              variant={inputMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("url")}
            >
              <Link className="mr-1.5 h-3.5 w-3.5" />
              Pokepaste URL
            </Button>
          </div>

          {/* Input area */}
          {inputMode === "paste" ? (
            <Textarea
              placeholder={
                "Paste your team in Showdown export format...\n\n" +
                "Example:\n" +
                "Koraidon @ Booster Energy\n" +
                "Ability: Orichalcum Pulse\n" +
                "Tera Type: Fire\n" +
                "EVs: 4 HP / 252 Atk / 252 Spe\n" +
                "Jolly Nature\n" +
                "- Flame Charge\n" +
                "- Collision Course\n" +
                "- Protect\n" +
                "- Swords Dance"
              }
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          ) : (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://pokepast.es/abc123..."
                value={pokepasteUrl}
                onChange={(e) => setPokepasteUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchPokepaste();
                  }
                }}
              />
              <Button
                onClick={handleFetchPokepaste}
                disabled={!pokepasteUrl.trim() || isFetchingPaste}
              >
                {isFetchingPaste ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link className="mr-2 h-4 w-4" />
                )}
                Fetch
              </Button>
            </div>
          )}

          {/* Validation errors */}
          {validation && !validation.valid && validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Team preview (shown when we have parsed Pokemon) */}
          {validation && validation.team.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">
                Preview ({validation.team.length}{" "}
                {validation.team.length === 1 ? "Pokemon" : "Pokemon"})
              </p>
              <TeamPreview
                pokemon={validation.team.map((mon) => ({
                  species: mon.species,
                  nickname: mon.nickname,
                  held_item: mon.held_item,
                  ability: mon.ability,
                  tera_type: mon.tera_type,
                  move1: mon.move1 ?? undefined,
                  move2: mon.move2 ?? undefined,
                  move3: mon.move3 ?? undefined,
                  move4: mon.move4 ?? undefined,
                }))}
                compact
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelEditing}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!validation?.valid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Submit Team
            </Button>
          </div>
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Team Submitted
            </CardTitle>
            <CardDescription>
              {submittedTeam?.submittedAt
                ? `Submitted ${new Date(submittedTeam.submittedAt).toLocaleString()}`
                : "Your team has been submitted"}
            </CardDescription>
          </div>
          {submittedTeam?.locked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show the submitted team */}
        {submittedTeam && submittedTeam.pokemon.length > 0 && (
          <TeamPreview pokemon={submittedTeam.pokemon} />
        )}

        {/* Replace button (disabled when locked) */}
        <Button
          variant="outline"
          onClick={() => startEditing("paste")}
          disabled={submittedTeam?.locked}
          className="w-full"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {submittedTeam?.locked ? "Team Locked" : "Replace Team"}
        </Button>
      </CardContent>
    </Card>
  );
}
