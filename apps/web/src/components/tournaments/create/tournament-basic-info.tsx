"use client";

import { type ActionResult } from "@trainers/validators";
import type { TournamentFormData } from "@trainers/tournaments/types";
import { useApiQuery } from "@trainers/supabase/react-query";
import { generateSlug } from "@trainers/utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

/** Minimal community shape needed to populate the community picker. */
interface MyCommunity {
  id: number;
  name: string;
}

interface TournamentBasicInfoProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

async function fetchMyCommunities(): Promise<ActionResult<MyCommunity[]>> {
  const res = await fetch("/api/v1/me/communities");
  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as MyCommunity[];
  return { success: true, data };
}

export function TournamentBasicInfo({
  formData,
  updateFormData,
}: TournamentBasicInfoProps) {
  const {
    data: organizations,
    isError,
    error,
  } = useApiQuery<MyCommunity[]>(
    ["me", "communities"],
    fetchMyCommunities,
    { staleTime: 30_000 }
  );

  const handleNameChange = (name: string) => {
    updateFormData({
      name,
      slug: generateSlug(name),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organization">Community *</Label>
        {isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load communities"}
            </AlertDescription>
          </Alert>
        ) : (
          <Select
            value={formData.communityId?.toString()}
            onValueChange={(value) =>
              updateFormData({
                communityId: value ? Number(value) : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {organizations?.map((community) => (
                <SelectItem key={community.id} value={String(community.id)}>
                  {community.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-muted-foreground text-sm">
          Choose the community that will host this tournament
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Tournament Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Spring Regional Championship"
        />
        <p className="text-muted-foreground text-sm">
          Give your tournament a descriptive name
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => updateFormData({ slug: e.target.value })}
          placeholder="spring-regional-championship"
        />
        <p className="text-muted-foreground text-sm">
          This will be used in the tournament URL. Only lowercase letters,
          numbers, and hyphens.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Describe your tournament, rules, prizes, etc."
          rows={4}
        />
        <p className="text-muted-foreground text-sm">
          Optional description that will be shown to players
        </p>
      </div>
    </div>
  );
}
