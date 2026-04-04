"use client";

import { useState, useTransition, useRef, use } from "react";
import { Camera, Loader2, X, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { toast } from "sonner";

import { getCommunityBySlug } from "@trainers/supabase";
import { type TypedSupabaseClient } from "@trainers/supabase";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@trainers/validators";
import {
  SOCIAL_LINK_PLATFORMS,
  communitySocialLinksSchema,
  type CommunitySocialLink,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { socialPlatformLabels } from "@trainers/utils";

import { useSupabaseQuery } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { updateOrganization } from "@/actions/communities";
import {
  uploadCommunityLogo,
  removeCommunityLogo,
} from "@/actions/community-logo";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/select";
import { PlatformIcon } from "@/components/communities/social-link-icons";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

const DESCRIPTION_MAX = 500;
const ABOUT_MAX = 10_000;

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
function parseSocialLinks(raw: unknown): CommunitySocialLink[] {
  const result = communitySocialLinksSchema.safeParse(raw);
  return result.success ? result.data : [];
}

// ============================================================================
// Page
// ============================================================================

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default function DashboardSettingsPage({ params }: PageProps) {
  const { communitySlug } = use(params);

  const communityQueryFn = (client: TypedSupabaseClient) =>
    getCommunityBySlug(client, communitySlug);

  const {
    data: org,
    isLoading,
    refetch,
  } = useSupabaseQuery(communityQueryFn, [communitySlug]);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl">
          {isLoading ? (
            <SettingsSkeleton />
          ) : !org ? (
            <p className="text-muted-foreground text-sm">
              Community not found.
            </p>
          ) : (
            <SettingsForm org={org} onSaved={refetch} />
          )}
        </div>
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

// ============================================================================
// Settings Form
// ============================================================================

interface SettingsFormProps {
  org: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    about: string | null;
    social_links: unknown;
    logo_url: string | null;
  };
  onSaved: () => void;
}

function SettingsForm({ org, onSaved }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isLogoUploading, startLogoTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    org.logo_url
  );

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [about, setAbout] = useState(org.about ?? "");
  const [socialLinks, setSocialLinks] = useState<CommunitySocialLink[]>(() =>
    parseSocialLinks(org.social_links)
  );

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const result = await uploadCommunityLogo(org.id, formData);
      if (result.success) {
        setCurrentLogoUrl(result.data.logoUrl);
        toast.success("Logo updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });

    e.target.value = "";
  };

  const handleLogoRemove = () => {
    startLogoTransition(async () => {
      const result = await removeCommunityLogo(org.id);
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
      toast.error("Community name is required");
      return;
    }

    const validLinks = socialLinks
      .filter((link) => link.url.trim())
      .map((link) => ({ ...link, url: link.url.trim() }));
    const parseResult = communitySocialLinksSchema.safeParse(validLinks);
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
          about: about.trim() || null,
          socialLinks: validLinks.length > 0 ? validLinks : undefined,
        },
        org.slug
      );

      if (result.success) {
        toast.success("Community settings updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Top row: Identity + Social Links side by side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Card: Community Identity */}
        <DashboardCard label="Community Identity">
          {/* Logo + Name */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLogoUploading}
              className={cn(
                "group border-border relative shrink-0 cursor-pointer rounded-lg border-2 border-dashed p-0.5 transition-colors",
                "hover:border-primary/60 disabled:cursor-not-allowed"
              )}
              aria-label="Upload community logo"
            >
              <Avatar noBorder className="h-24 w-24 rounded-md">
                {currentLogoUrl && (
                  <AvatarImage
                    src={currentLogoUrl}
                    alt={org.name}
                    className="rounded-md"
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary rounded-md text-xl font-semibold">
                  {org.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute inset-0.5 flex items-center justify-center rounded-md transition-opacity",
                  "bg-black/50 opacity-0 group-hover:opacity-100",
                  isLogoUploading && "opacity-100"
                )}
              >
                {isLogoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </button>

            <div className="min-w-0 flex-1">
              {currentLogoUrl && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  disabled={isLogoUploading}
                  className="text-muted-foreground hover:text-destructive mb-2 text-xs transition-colors disabled:opacity-50"
                >
                  Remove logo
                </button>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="communityName">Community Name</Label>
                <Input
                  id="communityName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Community"
                />
              </div>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                trainers.gg/communities/{org.slug}
              </p>
            </div>
          </div>
        </DashboardCard>

        {/* Social Links card */}
        <DashboardCard label="Social Links">
          <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
        </DashboardCard>
      </div>

      {/* About section — full width below */}
      <DashboardCard label="About">
        <div className="space-y-5">
          {/* Short description */}
          <div className="space-y-1.5">
            <Label htmlFor="communityDescription">Short Description</Label>
            <Textarea
              id="communityDescription"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
              }
              placeholder="A one or two sentence summary of your community..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                Appears on community cards and search results
              </p>
              <p
                className={cn(
                  "text-xs tabular-nums",
                  description.length >= DESCRIPTION_MAX
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {description.length} / {DESCRIPTION_MAX}
              </p>
            </div>
          </div>

          {/* Full about page */}
          <div className="space-y-1.5">
            <Label>About Page</Label>
            <p className="text-muted-foreground text-xs">
              Rich content shown on the About tab of your community page.
              Supports{" "}
              <a
                href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 underline-offset-2 hover:underline"
              >
                GitHub Flavored Markdown
              </a>
              .
            </p>
            <Tabs defaultValue="write">
              <TabsList className="mb-3">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value.slice(0, ABOUT_MAX))}
                  placeholder="Write your community's full about page in markdown..."
                  rows={24}
                />
                <div className="mt-1 flex justify-end">
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      about.length >= ABOUT_MAX
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {about.length.toLocaleString()} /{" "}
                    {ABOUT_MAX.toLocaleString()}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="preview">
                {about.trim() ? (
                  <MarkdownContent content={about} className="min-h-[200px]" />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Nothing to preview
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DashboardCard>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-teal-600 text-white hover:bg-teal-700"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
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
  links: CommunitySocialLink[];
  onChange: (links: CommunitySocialLink[]) => void;
}) {
  const addLink = () => {
    onChange([...links, { platform: "website", url: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const updateLink = (
    index: number,
    field: keyof CommunitySocialLink,
    value: string
  ) => {
    const updated = links.map((link, i) => {
      if (i !== index) return link;
      if (field === "platform") {
        const newPlatform = value as SocialLinkPlatform;
        if (newPlatform !== "custom") {
          const { label: _label, ...rest } = link;
          return { ...rest, platform: newPlatform };
        }
        return { ...link, platform: newPlatform };
      }
      return { ...link, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex items-center">
            {/* Platform prefix — fixed width, muted background */}
            <div
              className={cn(
                "relative flex h-9 w-10 shrink-0 items-center justify-center",
                "bg-muted border-input rounded-l-md border border-r-0"
              )}
            >
              {/* Visual icon — pointer-events-none so the Select trigger below is clickable */}
              <PlatformIcon
                platform={link.platform}
                className="pointer-events-none h-4 w-4"
              />
              <Select
                value={link.platform}
                onValueChange={(val) => {
                  if (val) updateLink(index, "platform", val);
                }}
              >
                {/* Invisible trigger overlaid on the icon box */}
                <SelectTrigger className="absolute inset-0 border-0 bg-transparent opacity-0 shadow-none" />
                <SelectContent>
                  {SOCIAL_LINK_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      <span className="flex items-center gap-2">
                        <PlatformIcon
                          platform={platform}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-sm">
                          {socialPlatformLabels[platform]}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* URL input */}
            <Input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder={
                PLATFORM_PLACEHOLDERS[link.platform] ?? "https://..."
              }
              className="min-w-0 flex-1 rounded-l-none"
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeLink(index)}
              aria-label="Remove social link"
              className={cn(
                "ml-1.5 shrink-0 rounded-md p-1.5 transition-colors",
                "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

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
      ))}

      {/* Add link */}
      <button
        type="button"
        onClick={addLink}
        className="flex items-center gap-1 text-sm text-teal-600 transition-colors hover:text-teal-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add link
      </button>
    </div>
  );
}
