"use client";

import { useState, useTransition, useRef, use } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getOrganizationBySlug } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { updateOrganization } from "@/actions/organizations";
import { uploadOrgLogo, removeOrgLogo } from "@/actions/organization-logo";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, Save, Plus, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@trainers/validators";
import {
  SOCIAL_LINK_PLATFORMS,
  organizationSocialLinksSchema,
  type OrganizationSocialLink,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { PlatformIcon } from "@/components/organizations/social-link-icons";
import { socialPlatformLabels } from "@trainers/utils";
import { cn } from "@/lib/utils";

/** URL placeholder per platform. */
const PLATFORM_PLACEHOLDERS: Partial<Record<SocialLinkPlatform, string>> = {
  discord: "https://discord.gg/your-server",
  twitter: "https://x.com/your-handle",
  youtube: "https://youtube.com/@your-channel",
  twitch: "https://twitch.tv/your-channel",
  tiktok: "https://tiktok.com/@your-handle",
  instagram: "https://instagram.com/your-handle",
  facebook: "https://facebook.com/your-page",
  reddit: "https://reddit.com/r/your-subreddit",
  github: "https://github.com/your-org",
  bluesky: "https://bsky.app/profile/your-handle",
  threads: "https://threads.net/@your-handle",
  mastodon: "https://mastodon.social/@your-handle",
  linkedin: "https://linkedin.com/company/your-org",
  patreon: "https://patreon.com/your-page",
  kofi: "https://ko-fi.com/your-page",
  website: "https://example.com",
  custom: "https://...",
};

/**
 * Parse the raw JSONB social_links field into a typed array.
 * Returns empty array if parsing fails.
 */
function parseSocialLinks(raw: unknown): OrganizationSocialLink[] {
  const result = organizationSocialLinksSchema.safeParse(raw);
  return result.success ? result.data : [];
}

// ============================================================================
// Page
// ============================================================================

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

// ============================================================================
// Profile Form
// ============================================================================

interface OrgProfileFormProps {
  org: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    social_links: unknown;
    logo_url: string | null;
  };
  onSaved: () => void;
}

function OrgProfileForm({ org, onSaved }: OrgProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isLogoUploading, startLogoTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    org.logo_url
  );

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [socialLinks, setSocialLinks] = useState<OrganizationSocialLink[]>(() =>
    parseSocialLinks(org.social_links)
  );

  const logoUrl = currentLogoUrl;

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size === 0) {
      toast.error("File is empty");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("File must be smaller than 2 MB");
      return;
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error("File must be a JPEG, PNG, WebP, or GIF image");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startLogoTransition(async () => {
      const result = await uploadOrgLogo(org.id, formData);
      if (result.success) {
        setCurrentLogoUrl(result.data.logoUrl);
        toast.success("Logo updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleLogoRemove = () => {
    startLogoTransition(async () => {
      const result = await removeOrgLogo(org.id);
      if (result.success) {
        setCurrentLogoUrl(null);
        toast.success("Logo removed");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    // Validate social links before submitting (trim URLs and drop empties)
    const validLinks = socialLinks
      .filter((link) => link.url.trim())
      .map((link) => ({ ...link, url: link.url.trim() }));
    const parseResult = organizationSocialLinksSchema.safeParse(validLinks);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      toast.error(firstError?.message ?? "Invalid social links");
      return;
    }

    startTransition(async () => {
      const result = await updateOrganization(
        org.id,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          socialLinks: validLinks.length > 0 ? validLinks : undefined,
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
          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLogoUploading}
                  className="group relative cursor-pointer disabled:cursor-not-allowed"
                >
                  <Avatar className="h-16 w-16">
                    {logoUrl && <AvatarImage src={logoUrl} alt={org.name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {org.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-full transition-opacity",
                      "bg-black/50 opacity-0 group-hover:opacity-100",
                      isLogoUploading && "opacity-100"
                    )}
                  >
                    {isLogoUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Click to upload a logo. JPEG, PNG, WebP, or GIF up to 2 MB.
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    disabled={isLogoUploading}
                    className="text-muted-foreground hover:text-destructive mt-1 flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          {/* Description */}
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

          {/* Social Links */}
          <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />

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

// ============================================================================
// Social Links Editor
// ============================================================================

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: OrganizationSocialLink[];
  onChange: (links: OrganizationSocialLink[]) => void;
}) {
  const addLink = () => {
    onChange([...links, { platform: "website", url: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const updateLink = (
    index: number,
    field: keyof OrganizationSocialLink,
    value: string
  ) => {
    const updated = links.map((link, i) => {
      if (i !== index) return link;
      if (field === "platform") {
        // When switching away from "custom", drop the label
        const newPlatform = value as SocialLinkPlatform;
        if (newPlatform !== "custom") {
          const { label: _, ...rest } = link;
          return { ...rest, platform: newPlatform };
        }
        return { ...link, platform: newPlatform };
      }
      return { ...link, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Social Links</Label>
      </div>

      {links.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No social links added yet.
        </p>
      )}

      {links.map((link, index) => (
        <div key={index} className="flex items-start gap-2">
          {/* Platform selector */}
          <Select
            value={link.platform}
            onValueChange={(val) => {
              if (val !== null) updateLink(index, "platform", val);
            }}
          >
            <SelectTrigger className="w-44 shrink-0">
              <span className="flex items-center gap-2">
                <PlatformIcon platform={link.platform} />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_LINK_PLATFORMS.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform={platform} />
                    {socialPlatformLabels[platform]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* URL input */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder={
                PLATFORM_PLACEHOLDERS[link.platform] ?? "https://..."
              }
            />
            {/* Label input for custom platform */}
            {link.platform === "custom" && (
              <Input
                value={link.label ?? ""}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                placeholder="Display label (e.g. My Blog)"
                className="text-xs"
              />
            )}
          </div>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeLink(index)}
            aria-label="Remove social link"
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addLink}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Social Link
      </Button>
    </div>
  );
}
