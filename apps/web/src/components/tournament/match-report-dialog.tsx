"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@trainers/validators";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import { getMatchDetails, reportMatchResult } from "@trainers/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Trophy,
  Swords,
  AlertCircle,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface MatchReportDialogProps {
  matchId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSubmitted?: () => void;
}

const matchReportSchema = z
  .object({
    winnerId: z.string().min(1, "Please select a winner"),
    player1Score: z.coerce.number().min(0).max(3),
    player2Score: z.coerce.number().min(0).max(3),
  })
  .refine((data) => data.player1Score !== data.player2Score, {
    message: "Scores cannot be tied",
    path: ["player1Score"],
  });

type MatchReportFormData = z.infer<typeof matchReportSchema>;

export function MatchReportDialog({
  matchId,
  open,
  onOpenChange,
  onReportSubmitted,
}: MatchReportDialogProps) {
  const form = useForm<MatchReportFormData>({
    resolver: zodResolver(matchReportSchema),
    defaultValues: {
      winnerId: "",
      player1Score: 2,
      player2Score: 0,
    },
  });

  const { isSubmitting } = form.formState;
  const player1Score = form.watch("player1Score");
  const player2Score = form.watch("player2Score");

  const { data: matchDetails } = useSupabaseQuery(
    async (supabase) => {
      if (!matchId) return null;
      return getMatchDetails(supabase, matchId);
    },
    [matchId]
  );

  const { mutateAsync: reportResultMutation } = useSupabaseMutation(
    (
      supabase,
      args: {
        matchId: number;
        winnerId: number;
        player1Score: number;
        player2Score: number;
      }
    ) =>
      reportMatchResult(
        supabase,
        args.matchId,
        args.winnerId,
        args.player1Score,
        args.player2Score
      )
  );

  // Extract player data
  const player1 = matchDetails?.player1;
  const player2 = matchDetails?.player2;
  const p1 = Array.isArray(player1) ? player1[0] : player1;
  const p2 = Array.isArray(player2) ? player2[0] : player2;

  // Auto-select winner based on scores
  useEffect(() => {
    if (player1Score > player2Score && p1) {
      form.setValue("winnerId", String(p1.id));
    } else if (player2Score > player1Score && p2) {
      form.setValue("winnerId", String(p2.id));
    }
  }, [player1Score, player2Score, p1, p2, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        winnerId: "",
        player1Score: 2,
        player2Score: 0,
      });
    }
  }, [open, form]);

  const onSubmit = async (data: MatchReportFormData) => {
    if (!matchId) return;

    try {
      await reportResultMutation({
        matchId,
        winnerId: Number(data.winnerId),
        player1Score: data.player1Score,
        player2Score: data.player2Score,
      });

      toast.success("Match reported", {
        description: "The match result has been recorded",
      });

      onReportSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to report match", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!matchDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { match, round, tournament } = matchDetails;

  const isMatchActive = match.status === "active";
  const isMatchPending = match.status === "pending";
  const isMatchCompleted = match.status === "completed";

  const winnerId = form.watch("winnerId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            {isMatchCompleted ? "Match Result" : "Report Match Result"}
          </DialogTitle>
          <DialogDescription>
            {tournament?.name ?? "Tournament"} • {round?.name ?? "Round"}
            {match.table_number ? ` • Table ${match.table_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isMatchCompleted && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              This match has already been reported
            </AlertDescription>
          </Alert>
        )}

        {isMatchPending && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This match will become active once the round starts
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Players */}
            <div className="grid grid-cols-2 gap-4">
              {/* Player 1 */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  winnerId === String(p1?.id)
                    ? "border-green-500 bg-green-500/10"
                    : match.winner_alt_id === p1?.id
                      ? "border-green-500/50 bg-green-500/5"
                      : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={p1?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {p1?.username ?? p1?.username ?? "BYE"}
                    </p>
                    <p className="text-muted-foreground text-xs">Player 1</p>
                  </div>
                  {match.winner_alt_id === p1?.id && (
                    <Badge variant="default" className="bg-green-600">
                      <Trophy className="mr-1 h-3 w-3" />
                      Winner
                    </Badge>
                  )}
                </div>

                {!isMatchCompleted && p1 && (
                  <FormField
                    control={form.control}
                    name="player1Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Games Won</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="3"
                            disabled={!isMatchActive || isSubmitting}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isMatchCompleted && (
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {match.game_wins1 || 0}
                    </p>
                    <p className="text-muted-foreground text-xs">Games Won</p>
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Badge variant="outline">VS</Badge>
                </div>
              </div>

              {/* Player 2 */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  winnerId === String(p2?.id)
                    ? "border-green-500 bg-green-500/10"
                    : match.winner_alt_id === p2?.id
                      ? "border-green-500/50 bg-green-500/5"
                      : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={p2?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {p2?.username ?? p2?.username ?? "BYE"}
                    </p>
                    <p className="text-muted-foreground text-xs">Player 2</p>
                  </div>
                  {match.winner_alt_id === p2?.id && (
                    <Badge variant="default" className="bg-green-600">
                      <Trophy className="mr-1 h-3 w-3" />
                      Winner
                    </Badge>
                  )}
                </div>

                {!isMatchCompleted && p2 && (
                  <FormField
                    control={form.control}
                    name="player2Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Games Won</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="3"
                            disabled={!isMatchActive || isSubmitting}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isMatchCompleted && (
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {match.game_wins2 || 0}
                    </p>
                    <p className="text-muted-foreground text-xs">Games Won</p>
                  </div>
                )}
              </div>
            </div>

            {/* Winner Selection */}
            {!isMatchCompleted && isMatchActive && (
              <>
                <Separator />
                <FormField
                  control={form.control}
                  name="winnerId"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select Winner</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          {p1 && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={String(p1.id)}
                                id="winner-1"
                              />
                              <FormLabel
                                htmlFor="winner-1"
                                className="flex-1 cursor-pointer font-normal"
                              >
                                {p1.username ?? p1.username} wins
                              </FormLabel>
                            </div>
                          )}
                          {p2 && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={String(p2.id)}
                                id="winner-2"
                              />
                              <FormLabel
                                htmlFor="winner-2"
                                className="flex-1 cursor-pointer font-normal"
                              >
                                {p2.username ?? p2.username} wins
                              </FormLabel>
                            </div>
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {isMatchCompleted ? "Close" : "Cancel"}
              </Button>

              {isMatchActive && (
                <Button type="submit" disabled={!winnerId || isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Report Result
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
