"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TournamentBasicInfo,
  TournamentFormat,
  TournamentSchedule,
  TournamentReview,
} from "@/components/tournaments";
import type { TournamentFormData } from "@/lib/types/tournament";
import { ArrowLeft, ArrowRight, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Basic Info", description: "Name and organization" },
  { id: 2, title: "Format", description: "Tournament structure" },
  { id: 3, title: "Schedule", description: "Dates and times" },
  { id: 4, title: "Review", description: "Confirm details" },
];

const defaultFormData: TournamentFormData = {
  name: "",
  slug: "",
  description: "",
  organizationId: undefined,
  format: "VGC 2025",
  tournamentFormat: "swiss_with_cut",
  maxParticipants: 32,
  roundTimeMinutes: 50,
  swissRounds: 5,
  topCutSize: 8,
  startDate: undefined,
  endDate: undefined,
  registrationDeadline: undefined,
  rentalTeamPhotosEnabled: false,
  rentalTeamPhotosRequired: false,
};

export default function CreateTournamentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TournamentFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const createTournament = useMutation(api.tournaments.mutations.create);

  const updateFormData = (updates: Partial<TournamentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Tournament name is required");
          return false;
        }
        if (!formData.organizationId) {
          toast.error("Please select an organization");
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
      toast.error("Please select an organization");
      return;
    }

    setIsSubmitting(true);
    try {
      const tournament = await createTournament({
        organizationId: formData.organizationId as never,
        name: formData.name,
        slug: formData.slug,
        startDate: formData.startDate,
        endDate: formData.endDate,
        format: formData.format,
      });

      toast.success("Tournament created!", {
        description: "Your tournament has been created successfully.",
      });

      // Navigate to the tournament management page
      if (tournament?.slug) {
        // Get org slug from the organization
        router.push(`/tournaments`);
      } else {
        router.push("/tournaments");
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

  // Auth check
  if (currentUser === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Sign in required</h3>
            <p className="text-muted-foreground mb-4 text-center">
              You need to be signed in to create a tournament
            </p>
            <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8" />
          Create Tournament
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up a new tournament for your community
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
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
            <TournamentBasicInfo
              formData={formData}
              updateFormData={updateFormData}
            />
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
      <div className="mt-6 flex justify-between">
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

        {/* On step 4, the TournamentReview component handles the submit button */}
      </div>
    </div>
  );
}
