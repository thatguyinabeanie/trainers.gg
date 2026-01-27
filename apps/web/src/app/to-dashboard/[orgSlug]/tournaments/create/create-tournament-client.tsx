"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import { getOrganizationBySlug, createTournament } from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  TournamentFormat,
  TournamentSchedule,
  TournamentReview,
} from "@/components/tournaments";
import type { TournamentFormData } from "@/lib/types/tournament";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trophy,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Basic Info", description: "Name and details" },
  { id: 2, title: "Structure", description: "Tournament format and rules" },
  { id: 3, title: "Schedule", description: "Dates and times" },
  { id: 4, title: "Review", description: "Confirm details" },
];

interface CreateTournamentClientProps {
  orgSlug: string;
}

export function CreateTournamentClient({
  orgSlug,
}: CreateTournamentClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch organization by slug
  const orgQueryFn = useCallback(
    (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
      getOrganizationBySlug(supabase, orgSlug),
    [orgSlug]
  );

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  // Form state - organization ID will be set from URL
  const [formData, setFormData] = useState<TournamentFormData>({
    name: "",
    slug: "",
    description: "",
    organizationId: undefined,
    format: "VGC 2025",
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
    rentalTeamPhotosEnabled: false,
    rentalTeamPhotosRequired: false,
  });

  // Update organization ID when org is loaded
  if (organization && formData.organizationId !== organization.id) {
    setFormData((prev) => ({ ...prev, organizationId: organization.id }));
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
        rentalTeamPhotosEnabled?: boolean;
        rentalTeamPhotosRequired?: boolean;
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

  const updateFormData = (updates: Partial<TournamentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    updateFormData({
      name,
      slug: generateSlug(name),
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Tournament name is required");
          return false;
        }
        if (!formData.slug.trim()) {
          toast.error("URL slug is required");
          return false;
        }
        return true;
      case 2:
        if (!formData.tournamentFormat) {
          toast.error("Please select a tournament format");
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!formData.organizationId) {
      toast.error("Organization not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const tournament = await createTournamentMutation({
        organizationId: formData.organizationId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        format: formData.format,
        tournamentFormat: formData.tournamentFormat,
        maxParticipants: formData.maxParticipants,
        swissRounds: formData.swissRounds,
        topCutSize: formData.topCutSize,
        roundTimeMinutes: formData.roundTimeMinutes,
        rentalTeamPhotosEnabled: formData.rentalTeamPhotosEnabled,
        rentalTeamPhotosRequired: formData.rentalTeamPhotosRequired,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : undefined,
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : undefined,
        registrationDeadline: formData.registrationDeadline
          ? new Date(formData.registrationDeadline).toISOString()
          : undefined,
        phases: formData.phases.map((p) => ({
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

      // Navigate to tournament management page
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
    } finally {
      setIsSubmitting(false);
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

  return (
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
      <div>
        <div className="mb-4 flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id <= currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                  step.id < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.id === currentStep
                      ? "border-primary"
                      : "border-muted"
                }`}
              >
                {step.id}
              </div>
              <span className="mt-1 hidden text-xs sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progressPercentage} />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
          <CardDescription>
            {STEPS[currentStep - 1]?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <Field>
                <FieldLabel htmlFor="name">Tournament Name *</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Spring Regional Championship"
                />
                <FieldDescription>
                  Give your tournament a descriptive name
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="slug">URL Slug *</FieldLabel>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => updateFormData({ slug: e.target.value })}
                  placeholder="spring-regional-championship"
                />
                <FieldDescription>
                  This will be used in the tournament URL:
                  trainers.gg/tournaments/{formData.slug || "your-slug"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    updateFormData({ description: e.target.value })
                  }
                  placeholder="Describe your tournament, rules, prizes, etc."
                  rows={4}
                />
                <FieldDescription>
                  Optional description that will be shown to players
                </FieldDescription>
              </Field>
            </div>
          )}
          {currentStep === 2 && (
            <TournamentFormat
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <TournamentSchedule
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 4 && (
            <TournamentReview
              formData={formData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || isSubmitting}
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
  );
}
