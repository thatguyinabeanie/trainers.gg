"use client";

import { useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { listMyOrganizations } from "@trainers/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TournamentFormData } from "@/lib/types/tournament";

interface TournamentBasicInfoProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

export function TournamentBasicInfo({
  formData,
  updateFormData,
}: TournamentBasicInfoProps) {
  const { data: organizations } = useSupabaseQuery(
    useCallback((supabase) => listMyOrganizations(supabase), []),
    []
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
    updateFormData({
      name,
      slug: generateSlug(name),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organization">Organization *</Label>
        <Select
          value={formData.organizationId}
          onValueChange={(value: string | null) =>
            updateFormData({ organizationId: value || undefined })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {organizations?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Choose the organization that will host this tournament
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
