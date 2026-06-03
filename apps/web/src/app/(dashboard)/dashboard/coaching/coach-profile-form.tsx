"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  COACH_SERVICE_TYPES,
  type CoachProfileInput,
} from "@trainers/validators";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { updateCoachProfileAction } from "./actions";

// ---------------------------------------------------------------------------
// Local display labels for service types
// ---------------------------------------------------------------------------

const SERVICE_TYPE_LABELS: Record<
  (typeof COACH_SERVICE_TYPES)[number],
  { label: string; description: string }
> = {
  live: {
    label: "Live Sessions",
    description: "Real-time coaching during practice or draft",
  },
  replay_review: {
    label: "Replay Review",
    description: "Recorded battle analysis with feedback",
  },
  team_review: {
    label: "Team Review",
    description: "Evaluate and improve your team composition",
  },
  mentorship: {
    label: "Mentorship",
    description: "Ongoing structured coaching relationship",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkRow {
  label: string;
  url: string;
}

interface CoachProfileFormProps {
  initial: CoachProfileInput;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachProfileForm({ initial }: CoachProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);

  // formats: stored as string[] in DB, edited as a comma-separated string
  const [formatsInput, setFormatsInput] = useState(initial.formats.join(", "));

  // links: repeatable rows with label + url
  const [links, setLinks] = useState<LinkRow[]>(
    initial.links.length > 0 ? initial.links : []
  );

  // serviceTypes: checkboxes
  const [serviceTypes, setServiceTypes] = useState<
    Set<(typeof COACH_SERVICE_TYPES)[number]>
  >(new Set(initial.serviceTypes as (typeof COACH_SERVICE_TYPES)[number][]));

  // ---------------------------------------------------------------------------
  // Link row helpers
  // ---------------------------------------------------------------------------

  function addLink() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function updateLink(index: number, field: keyof LinkRow, value: string) {
    setLinks((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  // ---------------------------------------------------------------------------
  // Service type toggle
  // ---------------------------------------------------------------------------

  function toggleServiceType(
    type: (typeof COACH_SERVICE_TYPES)[number],
    checked: boolean
  ) {
    setServiceTypes((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  function handleSave() {
    startTransition(async () => {
      // Parse formats: split on comma, trim, drop empties
      const formats = formatsInput
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      // Drop link rows where label or URL is blank (prevent validation errors)
      const validLinks = links.filter(
        (l) => l.label.trim().length > 0 && l.url.trim().length > 0
      );

      const payload: CoachProfileInput = {
        headline,
        bio,
        formats,
        links: validLinks,
        serviceTypes: Array.from(serviceTypes),
      };

      const result = await updateCoachProfileAction(payload);

      if (result.success) {
        toast.success("Coach profile saved");
      } else {
        toast.error(result.error ?? "Failed to save profile");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Headline + Bio */}
      <Card>
        <CardHeader>
          <CardTitle>About You</CardTitle>
          <CardDescription>
            Introduce yourself to players looking for a coach.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. VGC 2025 Regulation G specialist"
              maxLength={120}
            />
            <p className="text-muted-foreground text-xs">
              {headline.length}/120 — shown at the top of your coach profile
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell players about your experience, achievements, and coaching style..."
              maxLength={2000}
              rows={6}
            />
            <p className="text-muted-foreground text-xs">{bio.length}/2000</p>
          </div>
        </CardContent>
      </Card>

      {/* Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Formats</CardTitle>
          <CardDescription>
            Which formats do you coach? Separate with commas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="formats">Formats</Label>
            <Input
              id="formats"
              value={formatsInput}
              onChange={(e) => setFormatsInput(e.target.value)}
              placeholder="e.g. VGC 2025, Reg G, Scarlet/Violet OU"
            />
            <p className="text-muted-foreground text-xs">
              Comma-separated. Up to 20 entries, 40 characters each.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            Select the types of coaching you offer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {COACH_SERVICE_TYPES.map((type) => {
              const meta = SERVICE_TYPE_LABELS[type];
              return (
                <div key={type} className="flex items-start gap-3">
                  <Checkbox
                    id={`service-${type}`}
                    checked={serviceTypes.has(type)}
                    onCheckedChange={(checked) =>
                      toggleServiceType(type, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <Label
                      htmlFor={`service-${type}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {meta.label}
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {meta.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>
            Add relevant links — social profiles, coaching pages, Liquipedia,
            etc. Up to 10.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Link ${index + 1} label`}
                placeholder="Label (e.g. Twitter)"
                value={row.label}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                className="w-36 shrink-0"
                maxLength={40}
              />
              <Input
                aria-label={`Link ${index + 1} URL`}
                placeholder="https://..."
                value={row.url}
                onChange={(e) => updateLink(index, "url", e.target.value)}
                className="min-w-0 flex-1"
                maxLength={300}
                type="url"
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                aria-label={`Remove link ${index + 1}`}
                className="text-muted-foreground hover:text-destructive flex size-10 shrink-0 items-center justify-center rounded-md transition-colors sm:size-8"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {links.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add link
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
