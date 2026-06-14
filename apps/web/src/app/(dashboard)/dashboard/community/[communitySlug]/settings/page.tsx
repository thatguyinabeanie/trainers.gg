"use client";

import { useState, useTransition, useRef, use } from "react";
import Link from "next/link";
import {
  Camera,
  Loader2,
  X,
  Plus,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { toast } from "sonner";

import { getDiscordServerByCommunityId } from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@trainers/validators";
import {
  SOCIAL_LINK_PLATFORMS,
  communitySocialLinksSchema,
  type CommunitySocialLink,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { socialPlatformLabels } from "@trainers/utils";

import { useSupabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { updateOrganization } from "@/actions/communities";
import {
  uploadCommunityLogo,
  removeCommunityLogo,
} from "@/actions/community-logo";
import {
  uploadCommunityBanner,
  removeCommunityBanner,
} from "@/actions/community-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
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
// Shared types
// ============================================================================

/** Community fields consumed by the Settings page and form. */
interface SettingsFormOrg {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  about: string | null;
  social_links: unknown;
  logo_url: string | null;
  banner_url: string | null;
  bluesky_did: string | null;
  bluesky_handle: string | null;
  pds_status: string | null;
}

// ============================================================================
// Page
// ============================================================================

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default function DashboardSettingsPage({ params }: PageProps) {
  const { communitySlug } = use(params);

  // Fetch community via the /api/v1/communities/[slug] route (Phase 2 S-bucket migration).
  const {
    data: org,
    isLoading,
    refetch,
  } = useApiQuery<SettingsFormOrg | null>(
    ["community", communitySlug],
    async () => {
      const res = await fetch(
        `/api/v1/communities/${encodeURIComponent(communitySlug)}`
      );
      if (!res.ok) {
        return { success: false as const, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as SettingsFormOrg | null;
      return { success: true as const, data };
    },
    { staleTime: 30_000 }
  );

  return (
    <>
      <PageHeader title="Settings" />
      <DashboardContent>
        {isLoading ? (
          <SettingsSkeleton />
        ) : !org ? (
          <p className="text-muted-foreground text-sm">Community not found.</p>
        ) : (
          <SettingsForm
            org={org}
            communitySlug={communitySlug}
            onSaved={refetch}
          />
        )}
      </DashboardContent>
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
  org: SettingsFormOrg;
  communitySlug: string;
  onSaved: () => void;
}

function SettingsForm({ org, communitySlug, onSaved }: SettingsFormProps) {
  const supabase = useSupabase();
  const [isPending, startTransition] = useTransition();
  const [isLogoUploading, startLogoTransition] = useTransition();
  const [isBannerUploading, startBannerTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    org.logo_url
  );
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(
    org.banner_url
  );

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [about, setAbout] = useState(org.about ?? "");
  const [socialLinks, setSocialLinks] = useState<CommunitySocialLink[]>(() =>
    parseSocialLinks(org.social_links)
  );

  const { data: discordServer } = useQuery({
    queryKey: queryKeys.community.discordServer(org.id),
    queryFn: () => getDiscordServerByCommunityId(supabase, org.id),
    staleTime: 30_000,
  });
  const discordInstalled = discordServer != null;

  /** Fire-and-forget PDS profile sync (only if community has active PDS). */
  const syncProfileToPds = () => {
    if (org.pds_status === "active" && org.bluesky_did) {
      supabase.functions
        .invoke("sync-community-profile", {
          body: { communityId: org.id },
        })
        .catch(() => {
          // Non-blocking — don't fail the save
        });
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input immediately so re-selecting the same file triggers 'change'
    e.target.value = "";

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
        syncProfileToPds();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleLogoRemove = () => {
    startLogoTransition(async () => {
      const result = await removeCommunityLogo(org.id);
      if (result.success) {
        setCurrentLogoUrl(null);
        toast.success("Logo removed");
        onSaved();
        syncProfileToPds();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input immediately so re-selecting the same file triggers 'change'
    e.target.value = "";

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

    startBannerTransition(async () => {
      const result = await uploadCommunityBanner(org.id, formData);
      if (result.success) {
        setCurrentBannerUrl(result.data.bannerUrl);
        toast.success("Banner updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleBannerRemove = () => {
    startBannerTransition(async () => {
      const result = await removeCommunityBanner(org.id);
      if (result.success) {
        setCurrentBannerUrl(null);
        toast.success("Banner removed");
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
        syncProfileToPds();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Banner Image — full width */}
      <DashboardCard label="Banner Image">
        <p className="text-muted-foreground mb-3 text-xs">
          Displayed at the top of your community page. Recommended size: 1200
          &times; 300px.
        </p>
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          disabled={isBannerUploading}
          className={cn(
            "border-border group relative w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors",
            "hover:border-primary/60 disabled:cursor-not-allowed",
            currentBannerUrl ? "h-36 sm:h-44" : "h-28 sm:h-36"
          )}
          aria-label="Upload community banner"
        >
          {currentBannerUrl ? (
            <img
              src={currentBannerUrl}
              alt="Community banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="bg-muted/50 flex h-full w-full items-center justify-center">
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Click to upload a banner</span>
              </div>
            </div>
          )}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-lg transition-opacity",
              "bg-black/50 opacity-0 group-hover:opacity-100",
              isBannerUploading && "opacity-100"
            )}
          >
            {isBannerUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleBannerSelect}
          className="hidden"
          aria-label="Upload community banner image"
        />
        {currentBannerUrl && (
          <button
            type="button"
            onClick={handleBannerRemove}
            disabled={isBannerUploading}
            className="text-muted-foreground hover:text-destructive mt-2 text-xs transition-colors disabled:opacity-50"
          >
            Remove banner
          </button>
        )}
      </DashboardCard>

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
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Upload community logo"
              onChange={handleLogoSelect}
              className="hidden"
            />

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
          <SocialLinksEditor
            links={socialLinks}
            onChange={setSocialLinks}
            communitySlug={communitySlug}
            discordInstalled={discordInstalled}
          />
        </DashboardCard>
      </div>

      {/* Bluesky Identity card — full width */}
      <BlueskyIdentityCard
        communityId={org.id}
        handle={org.bluesky_handle}
        did={org.bluesky_did}
        pdsStatus={org.pds_status}
        slug={org.slug}
        onProvisioned={onSaved}
      />

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

interface SocialLinksEditorProps {
  links: CommunitySocialLink[];
  onChange: (links: CommunitySocialLink[]) => void;
  communitySlug: string;
  discordInstalled: boolean;
}

function SocialLinksEditor({
  links,
  onChange,
  communitySlug,
  discordInstalled,
}: SocialLinksEditorProps) {
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
          <div className="flex items-center gap-1.5">
            {/* Platform prefix — fixed width, muted background */}
            <div
              className={cn(
                "relative flex h-9 w-10 shrink-0 items-center justify-center",
                "bg-muted border-input rounded-l-md border border-r-0",
                "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-1"
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
                <SelectTrigger
                  aria-label={`Change platform: ${socialPlatformLabels[link.platform]}`}
                  className="absolute inset-0 border-0 bg-transparent opacity-0 shadow-none"
                />
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
              className={cn(
                "min-w-0 flex-1 rounded-l-none",
                // Remove right rounding when the discord chip is adjacent
                link.platform === "discord" &&
                  discordInstalled &&
                  "rounded-r-none"
              )}
            />

            {/* Discord "bot installed — configure" chip */}
            {link.platform === "discord" && discordInstalled && (
              <Link
                href={`/dashboard/community/${communitySlug}/settings/integrations/discord`}
                className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 inline-flex shrink-0 items-center gap-1 rounded-r-md border px-3 py-2 text-xs font-medium no-underline"
                data-testid="discord-bot-chip"
              >
                <span>🤖</span>
                <span>Bot installed — configure</span>
                <span aria-hidden>›</span>
              </Link>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeLink(index)}
              aria-label="Remove social link"
              className={cn(
                "shrink-0 rounded-md p-1.5 transition-colors",
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

// ============================================================================
// Bluesky Identity Card
// ============================================================================

interface BlueskyIdentityCardProps {
  communityId: number;
  handle: string | null;
  did: string | null;
  pdsStatus: string | null;
  slug: string;
  onProvisioned: () => void;
}

function BlueskyIdentityCard({
  communityId,
  handle,
  did,
  pdsStatus,
  slug,
  onProvisioned,
}: BlueskyIdentityCardProps) {
  const supabase = useSupabase();
  const [isProvisioning, startProvisionTransition] = useTransition();

  const isActive = pdsStatus === "active" && !!did;
  const isFailed = pdsStatus === "failed";
  const isPending = !pdsStatus || pdsStatus === "pending";

  const handleProvision = () => {
    startProvisionTransition(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("You must be logged in to enable Bluesky identity");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "provision-community-pds",
        {
          body: { communityId },
        }
      );

      if (error) {
        toast.error("Failed to create Bluesky identity");
        return;
      }

      if (data?.success) {
        toast.success(`Bluesky identity created: @${data.handle}`);
        onProvisioned();
      } else {
        toast.error(data?.error || "Failed to create Bluesky identity");
      }
    });
  };

  return (
    <DashboardCard label="Bluesky Identity">
      {isActive ? (
        <div className="space-y-3">
          <StatusBadge status="active" label="Active on network" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Handle</span>
              <a
                href={`https://bsky.app/profile/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                @{handle}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">DID</span>
              <span className="text-muted-foreground max-w-[200px] truncate font-mono text-xs">
                {did}
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Your community&apos;s profile on Bluesky syncs automatically when
            you update your name, logo, or description.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Give your community a presence on the Bluesky network. Anyone on
            Bluesky will be able to find and follow{" "}
            <span className="text-foreground font-medium">
              @{slug}.trainers.gg
            </span>
            .
          </p>

          {isFailed && (
            <p className="text-destructive text-xs">
              Previous attempt failed. You can try again.
            </p>
          )}

          <Button
            onClick={handleProvision}
            disabled={isProvisioning}
            variant="outline"
            size="sm"
          >
            {isProvisioning && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isFailed ? "Retry" : "Enable Bluesky Identity"}
          </Button>

          {isPending && (
            <p className="text-muted-foreground text-xs">
              This will create an AT Protocol account on trainers.gg&apos;s PDS
              with the handle @{slug}.trainers.gg.
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
