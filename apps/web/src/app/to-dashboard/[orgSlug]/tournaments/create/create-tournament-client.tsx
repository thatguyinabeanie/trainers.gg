"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import { getOrganizationBySlug, createTournament } from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  TournamentFormat,
  TournamentRegistration,
  TournamentSchedule,
  TournamentReview,
  TournamentGameSettings,
} from "@/components/tournaments";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Trophy,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

// Phase configuration schema
const phaseConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  phaseType: z.enum(["swiss", "single_elimination", "double_elimination"]),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  roundTimeMinutes: z.number().min(0),
  checkInTimeMinutes: z.number().min(0),
  plannedRounds: z.number().optional(),
  cutRule: z
    .enum(["x-1", "x-2", "x-3", "top-4", "top-8", "top-16", "top-32"])
    .optional(),
});

// Main tournament form schema
const tournamentFormSchema = z.object({
  // Basic info
  name: z
    .string()
    .min(1, "Tournament name is required")
    .min(3, "Name must be at least 3 characters"),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed"
    ),
  description: z.string().optional(),
  organizationId: z.number().optional(),

  // Game settings
  game: z.string().optional(),
  gameFormat: z.string().optional(),
  platform: z.enum(["cartridge", "showdown"]),
  battleFormat: z.enum(["singles", "doubles"]),

  // Tournament format
  tournamentFormat: z.enum([
    "swiss_only",
    "swiss_with_cut",
    "single_elimination",
    "double_elimination",
  ]),
  preset: z.enum(["swiss_only", "swiss_with_cut", "custom"]),
  phases: z.array(phaseConfigSchema),

  // Participant settings
  maxParticipants: z.number().optional(),
  roundTimeMinutes: z.number(),
  swissRounds: z.number().optional(),
  topCutSize: z.number().optional(),

  // Schedule
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  registrationDeadline: z.number().optional(),

  // Registration settings
  registrationType: z.enum(["open", "invite_only"]),
  playerCapEnabled: z.boolean(),
  checkInRequired: z.boolean(),
  allowLateRegistration: z.boolean(),
});

export type TournamentFormValues = z.infer<typeof tournamentFormSchema>;

const STEPS = [
  {
    id: 1,
    title: "Details",
    description: "Basic info, schedule, and registration",
  },
  {
    id: 2,
    title: "Structure",
    description: "Game settings and tournament format",
  },
  { id: 3, title: "Review", description: "Confirm details" },
];

interface CreateTournamentClientProps {
  orgSlug: string;
}

export function CreateTournamentClient({
  orgSlug,
}: CreateTournamentClientProps) {
  const router = useRouter();
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  // Form setup with React Hook Form
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      organizationId: undefined,
      game: "sv",
      gameFormat: "reg-i",
      platform: "cartridge",
      battleFormat: "doubles",
      tournamentFormat: "swiss_with_cut",
      preset: "swiss_with_cut",
      phases: [
        {
          id: "swiss-1",
          name: "Swiss Rounds",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 5,
        },
        {
          id: "topcut-1",
          name: "Top Cut",
          phaseType: "single_elimination",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 5,
          cutRule: "x-2",
        },
      ],
      maxParticipants: 32,
      roundTimeMinutes: 50,
      swissRounds: 5,
      topCutSize: 8,
      startDate: undefined,
      endDate: undefined,
      registrationDeadline: undefined,
      registrationType: "open",
      playerCapEnabled: false,
      checkInRequired: true,
      allowLateRegistration: true,
    },
    mode: "onBlur",
  });

  const { formState } = form;
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch organization by slug
  const orgQueryFn = (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
    getOrganizationBySlug(supabase, orgSlug);

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  // Update organization ID when org is loaded
  const currentOrgId = form.watch("organizationId");
  if (organization && currentOrgId !== organization.id) {
    form.setValue("organizationId", organization.id);
  }

  const { mutateAsync: createTournamentMutation } = useSupabaseMutation(
    (
      supabase,
      args: {
        organizationId: number;
        name: string;
        slug: string;
        description?: string;
        format?: string;
        startDate?: string;
        endDate?: string;
        registrationDeadline?: string;
        maxParticipants?: number;
        topCutSize?: number;
        swissRounds?: number;
        tournamentFormat?:
          | "swiss_only"
          | "swiss_with_cut"
          | "single_elimination"
          | "double_elimination";
        roundTimeMinutes?: number;
        game?: string;
        gameFormat?: string;
        platform?: string;
        battleFormat?: string;
        registrationType?: string;
        checkInRequired?: boolean;
        allowLateRegistration?: boolean;
        phases?: {
          name: string;
          phaseType: "swiss" | "single_elimination" | "double_elimination";
          bestOf: 1 | 3 | 5;
          roundTimeMinutes: number;
          checkInTimeMinutes: number;
          plannedRounds?: number;
          cutRule?:
            | "x-1"
            | "x-2"
            | "x-3"
            | "top-4"
            | "top-8"
            | "top-16"
            | "top-32";
        }[];
      }
    ) => createTournament(supabase, args)
  );

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    form.setValue("slug", generateSlug(name));
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1: {
        const result = await form.trigger(["name", "slug"]);
        if (!result) {
          toast.error("Please fix the errors before continuing");
          return false;
        }
        return true;
      }
      case 2: {
        const game = form.getValues("game");
        const gameFormat = form.getValues("gameFormat");
        const tournamentFormat = form.getValues("tournamentFormat");

        if (!game) {
          toast.error("Please select a Pokemon game");
          return false;
        }
        if (!gameFormat) {
          toast.error("Please select a game format");
          return false;
        }
        if (!tournamentFormat) {
          toast.error("Please select a tournament format");
          return false;
        }
        return true;
      }
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const data = form.getValues();

    if (!data.organizationId) {
      toast.error("Organization not found");
      return;
    }

    try {
      const tournament = await createTournamentMutation({
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        tournamentFormat: data.tournamentFormat,
        maxParticipants: data.playerCapEnabled
          ? data.maxParticipants
          : undefined,
        swissRounds: data.swissRounds,
        topCutSize: data.topCutSize,
        roundTimeMinutes: data.roundTimeMinutes,
        startDate: data.startDate
          ? new Date(data.startDate).toISOString()
          : undefined,
        endDate: data.endDate
          ? new Date(data.endDate).toISOString()
          : undefined,
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline).toISOString()
          : undefined,
        game: data.game,
        gameFormat: data.gameFormat,
        platform: data.platform,
        battleFormat: data.battleFormat,
        registrationType: data.registrationType,
        checkInRequired: data.checkInRequired,
        allowLateRegistration: data.allowLateRegistration,
        phases: data.phases.map((p) => ({
          name: p.name,
          phaseType: p.phaseType,
          bestOf: p.bestOf,
          roundTimeMinutes: p.roundTimeMinutes,
          checkInTimeMinutes: p.checkInTimeMinutes,
          plannedRounds: p.plannedRounds,
          cutRule: p.cutRule,
        })),
      });

      toast.success("Tournament created!", {
        description: "Your tournament has been created successfully.",
      });

      if (tournament?.slug) {
        router.push(
          `/to-dashboard/${orgSlug}/tournaments/${tournament.slug}/manage`
        );
      } else {
        router.push(`/to-dashboard/${orgSlug}/tournaments`);
      }
    } catch (error) {
      toast.error("Failed to create tournament", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  // Loading state
  if (userLoading || orgLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Org not found
  if (!organization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Organization not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This organization doesn&apos;t exist or has been removed
          </p>
          <Link href="/to-dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Auth check
  if (!currentUser) {
    router.push("/sign-in");
    return null;
  }

  // Permission check
  const isOwner = currentUser.id === organization.owner_user_id;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground mb-4 text-center">
            You don&apos;t have permission to create tournaments for this
            organization
          </p>
          <Link href={`/organizations/${orgSlug}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              View Organization
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (currentStep / STEPS.length) * 100;

  // Helper to convert form values to TournamentFormData for child components
  const formData = form.getValues();
  const updateFormData = (updates: Partial<TournamentFormValues>) => {
    Object.entries(updates).forEach(([key, value]) => {
      form.setValue(key as keyof TournamentFormValues, value as never);
    });
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/to-dashboard/${orgSlug}/tournaments`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Trophy className="h-6 w-6" />
              Create Tournament
            </h1>
            <p className="text-muted-foreground text-sm">
              For {organization.name}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-4 flex justify-between">
            {STEPS.map((stepItem, index) => {
              const isCompleted = stepItem.id < currentStep;
              const isCurrent = stepItem.id === currentStep;
              const isClickable = stepItem.id < currentStep;

              return (
                <div key={stepItem.id} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => isClickable && setCurrentStep(stepItem.id)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center ${
                      isClickable ? "cursor-pointer" : "cursor-default"
                    } ${
                      stepItem.id <= currentStep
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary/10"
                            : "border-muted"
                      } ${isClickable ? "hover:bg-primary/20" : ""}`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        stepItem.id
                      )}
                    </div>
                    <span className="mt-1 hidden text-xs sm:block">
                      {stepItem.title}
                    </span>
                  </button>

                  {/* Connector line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-2 hidden h-0.5 flex-1 sm:block ${
                        stepItem.id < currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progressPercentage} className="sm:hidden" />
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">
              {STEPS[currentStep - 1]?.title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {STEPS[currentStep - 1]?.description}
            </p>
          </div>

          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Basic Info Section - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tournament Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Spring Regional Championship"
                              {...field}
                              onChange={(e) => handleNameChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Give your tournament a descriptive name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="spring-regional-championship"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            trainers.gg/tournaments/{field.value || "your-slug"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your tournament, rules, prizes, etc."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description that will be shown to players
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Schedule & Registration - Side by Side */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Schedule Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TournamentSchedule
                      formData={formData}
                      updateFormData={updateFormData}
                    />
                  </CardContent>
                </Card>

                {/* Registration Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Registration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TournamentRegistration
                      formData={formData}
                      updateFormData={updateFormData}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Game Settings Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Game Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentGameSettings
                    game={formData.game}
                    gameFormat={formData.gameFormat}
                    platform={formData.platform}
                    battleFormat={formData.battleFormat}
                    onGameChange={(game) => form.setValue("game", game)}
                    onGameFormatChange={(gameFormat) =>
                      form.setValue("gameFormat", gameFormat)
                    }
                    onPlatformChange={(platform) =>
                      form.setValue("platform", platform)
                    }
                    onBattleFormatChange={(battleFormat) =>
                      form.setValue("battleFormat", battleFormat)
                    }
                  />
                </CardContent>
              </Card>

              {/* Tournament Format Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentFormat
                    formData={formData}
                    updateFormData={updateFormData}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          {currentStep === 3 && (
            <TournamentReview
              formData={formData}
              onSubmit={handleSubmit}
              isSubmitting={formState.isSubmitting}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || formState.isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < STEPS.length && (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}
