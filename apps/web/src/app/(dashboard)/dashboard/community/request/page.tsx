"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submitOrganizationRequestSchema,
  type SubmitOrganizationRequestInput,
  type SocialLinkPlatform,
} from "@trainers/validators";
import { generateSlug } from "@trainers/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { getMyOrganizationRequest } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlatformIcon } from "@/components/communities/social-link-icons";
import { submitCommunityRequestAction } from "@/actions/community-requests";
import { cn } from "@/lib/utils";
import { Loader2, Clock, AlertCircle, Check, X, House } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOLDOWN_DAYS = 7;

const SOCIAL_FIELDS: Array<{
  name: keyof Pick<
    SubmitOrganizationRequestInput,
    | "twitter_handle"
    | "bluesky_handle"
    | "instagram_handle"
    | "youtube_handle"
    | "twitch_handle"
  >;
  label: string;
  platform: SocialLinkPlatform;
  placeholder: string;
  urlPattern: RegExp;
}> = [
  {
    name: "twitter_handle",
    label: "X",
    platform: "twitter",
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:(?:x|twitter)\.com)\/(.+)/i,
  },
  {
    name: "bluesky_handle",
    label: "Bluesky",
    platform: "bluesky",
    placeholder: "handle.bsky.social",
    urlPattern: /(?:https?:\/\/)?bsky\.app\/profile\/(.+)/i,
  },
  {
    name: "youtube_handle",
    label: "YouTube",
    platform: "youtube",
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@?(.+)/i,
  },
  {
    name: "twitch_handle",
    label: "Twitch",
    platform: "twitch",
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(.+)/i,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCooldownExpired(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
  return new Date() >= cooldownEnd;
}

function getCooldownEndDate(reviewedAt: string): string {
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
  return cooldownEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardCommunityRequestPage() {
  const { data: request, isLoading } = useSupabaseQuery(
    (client) => getMyOrganizationRequest(client),
    []
  );

  const showForm =
    !request ||
    (request.status === "rejected" && isCooldownExpired(request.reviewed_at));
  const showStatus = !!request && !showForm;

  return (
    <>
      <PageHeader title="Request a Community" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="w-full max-w-[520px]">
          {isLoading ? (
            <RequestPageSkeleton />
          ) : showStatus && request ? (
            <RequestStatus request={request} />
          ) : (
            <RequestForm
              rejectedRequest={
                request?.status === "rejected" ? request : undefined
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RequestPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="bg-muted h-12 w-12 rounded-xl" />
        <div className="bg-muted h-5 w-44 rounded" />
        <div className="bg-muted h-3.5 w-64 rounded" />
      </div>
      <div className="bg-muted h-28 rounded-lg" />
      <div className="space-y-3">
        <div className="bg-muted h-4 w-32 rounded" />
        <div className="bg-muted h-9 w-full rounded" />
        <div className="bg-muted h-20 w-full rounded" />
      </div>
      <div className="bg-muted h-24 rounded-lg" />
      <div className="bg-muted h-9 w-full rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status display (pending / rejected-in-cooldown)
// ---------------------------------------------------------------------------

interface StatusRequest {
  name: string;
  slug: string;
  status: string;
  created_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

function RequestStatus({ request }: { request: StatusRequest }) {
  if (request.status === "pending") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">
          Your request is pending review
        </h2>
        <Badge
          variant="secondary"
          className="mb-4 border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400"
        >
          Pending
        </Badge>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            <span className="text-foreground font-medium">{request.name}</span>{" "}
            &middot; trainers.gg/communities/{request.slug}
          </p>
          {request.created_at && (
            <p>
              Submitted{" "}
              {new Date(request.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          We&apos;ll notify you when it&apos;s reviewed.
        </p>
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/10">
          <AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">
          Your previous request was not approved
        </h2>
        <Badge
          variant="secondary"
          className="mb-4 border-gray-500/25 bg-gray-500/15 text-gray-600 dark:text-gray-400"
        >
          Not Approved
        </Badge>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            <span className="text-foreground font-medium">{request.name}</span>
          </p>
          {request.admin_notes && (
            <p className="mt-2 rounded-lg bg-gray-500/10 px-4 py-2">
              {request.admin_notes}
            </p>
          )}
        </div>
        {request.reviewed_at && (
          <p className="text-muted-foreground mt-4 text-sm">
            You can submit a new request after{" "}
            {getCooldownEndDate(request.reviewed_at)}.
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Request form (redesigned)
// ---------------------------------------------------------------------------

interface RequestFormProps {
  rejectedRequest?: { name: string; admin_notes: string | null } | undefined;
}

function RequestForm({ rejectedRequest }: RequestFormProps) {
  const router = useRouter();

  const form = useForm<SubmitOrganizationRequestInput>({
    resolver: zodResolver(submitOrganizationRequestSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      discord_invite_code: "",
      twitter_handle: "",
      bluesky_handle: "",
      instagram_handle: "",
      youtube_handle: "",
      twitch_handle: "",
      other_url: "",
    },
  });

  const { isSubmitting } = form.formState;
  const name = form.watch("name");

  // Keep slug in sync with name so validation passes
  useEffect(() => {
    form.setValue("slug", name ? generateSlug(name) : "");
  }, [name, form]);

  async function onSubmit(data: SubmitOrganizationRequestInput) {
    const result = await submitCommunityRequestAction({
      ...data,
      slug: generateSlug(data.name),
    });

    if (result.success) {
      toast.success("Community request submitted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Welcome header */}
        <div className="mb-2 text-center">
          <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <House className="text-primary h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Start your community</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Tell us about your community and we&apos;ll get you set up on
            trainers.gg
          </p>
        </div>

        {/* Previous rejection notice */}
        {rejectedRequest && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            Your previous request for &ldquo;{rejectedRequest.name}&rdquo; was
            not approved.
            {rejectedRequest.admin_notes && (
              <> Reason: {rejectedRequest.admin_notes}</>
            )}
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <p className="mb-3 text-xs font-semibold">What we look for</p>
          <ul className="space-y-2">
            <GuidelineItem type="yes">
              Welcoming, inclusive community space
            </GuidelineItem>
            <GuidelineItem type="yes">
              Active Discord with real members
            </GuidelineItem>
            <GuidelineItem type="yes">
              Zero tolerance for bigotry or harassment
            </GuidelineItem>
            <GuidelineItem type="no">
              Server size and follower count don&apos;t matter
            </GuidelineItem>
          </ul>
        </div>

        {/* Section: Your community */}
        <div className="space-y-4">
          <p className="text-sm font-semibold">Your community</p>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Pallet Town VGC"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                {name && (
                  <p className="text-muted-foreground font-mono text-xs">
                    trainers.gg/communities/{generateSlug(name)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What&apos;s your community about?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What events do you run? Who does your community serve? What makes it special?"
                    disabled={isSubmitting}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section: Discord — highlighted */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Discord</p>
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
              <PlatformIcon
                platform="discord"
                className="h-3.5 w-3.5 shrink-0"
              />
              Server invite link
              <span className="text-destructive ml-0.5 text-[10px] font-normal">
                required
              </span>
            </p>
            <FormField
              control={form.control}
              name="discord_invite_code"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="sr-only">
                    Discord Server Invite
                  </FormLabel>
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "border-input flex h-9 w-10 shrink-0 items-center justify-center bg-violet-500/10",
                        "rounded-l-md border border-r-0"
                      )}
                    >
                      <PlatformIcon
                        platform="discord"
                        className="h-4 w-4 shrink-0 text-violet-500"
                      />
                    </span>
                    <FormControl>
                      <Input
                        placeholder="discord.gg/your-invite or just the code"
                        disabled={isSubmitting}
                        className="rounded-l-none"
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value;
                          const match = value.match(
                            /(?:https?:\/\/)?(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9-]+)/i
                          );
                          if (match?.[1]) {
                            value = match[1];
                          }
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    We&apos;ll check your Discord to make sure it&apos;s a
                    welcoming space
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section: Other accounts (optional 2-col grid) */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            Other accounts{" "}
            <span className="text-muted-foreground text-xs font-normal">
              optional
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SOCIAL_FIELDS.map((social) => (
              <FormField
                key={social.name}
                control={form.control}
                name={social.name}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="sr-only">{social.label}</FormLabel>
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "bg-muted border-input flex h-9 w-[84px] shrink-0 items-center gap-1.5 px-2",
                          "rounded-l-md border border-r-0 text-xs"
                        )}
                      >
                        <PlatformIcon
                          platform={social.platform}
                          className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        />
                        <span className="text-muted-foreground truncate text-xs">
                          {social.label}
                        </span>
                      </span>
                      <FormControl>
                        <Input
                          placeholder={social.placeholder}
                          disabled={isSubmitting}
                          className="min-w-0 rounded-l-none text-xs"
                          {...field}
                          onChange={(e) => {
                            let value = e.target.value;
                            const match = value.match(social.urlPattern);
                            if (match?.[1]) {
                              value = match[1]
                                .replace(/[?#].*$/, "")
                                .replace(/\/+$/, "");
                            }
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="space-y-2 pt-1">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            We typically review requests within 48 hours
          </p>
        </div>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Guideline item
// ---------------------------------------------------------------------------

function GuidelineItem({
  type,
  children,
}: {
  type: "yes" | "no";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          type === "yes"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-gray-500/15 text-gray-500 dark:text-gray-400"
        )}
      >
        {type === "yes" ? (
          <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
        ) : (
          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
        )}
      </span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
