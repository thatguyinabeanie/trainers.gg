"use client";

import { useState, useTransition, use } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getOrganizationBySlug } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { updateOrganization } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Loader2, Save, Globe } from "lucide-react";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function OrgSettingsPage({ params }: PageProps) {
  const { orgSlug } = use(params);

  const orgQueryFn = (client: TypedSupabaseClient) =>
    getOrganizationBySlug(client, orgSlug);

  const {
    data: org,
    isLoading,
    refetch,
  } = useSupabaseQuery(orgQueryFn, [orgSlug]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Organization Settings</h2>
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Organization Settings</h2>
        <p className="text-muted-foreground text-sm">
          Configure your organization&apos;s profile and settings
        </p>
      </div>

      <OrgProfileForm org={org} onSaved={refetch} />
    </div>
  );
}

interface OrgProfileFormProps {
  org: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    website_url: string | null;
    logo_url: string | null;
  };
  onSaved: () => void;
}

function OrgProfileForm({ org, onSaved }: OrgProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(org.website_url ?? "");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    startTransition(async () => {
      const result = await updateOrganization(
        org.id,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          website: websiteUrl.trim() || undefined,
        },
        org.slug
      );

      if (result.success) {
        toast.success("Organization settings updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Profile
          </CardTitle>
          <CardDescription>
            Public information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDescription">Description</Label>
            <Textarea
              id="orgDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your organization..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgWebsite">
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Website URL
              </div>
            </Label>
            <Input
              id="orgWebsite"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slug</CardTitle>
          <CardDescription>
            Your organization&apos;s URL identifier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md px-3 py-2 text-sm">
            trainers.gg/organizations/{org.slug}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            The slug cannot be changed after creation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
