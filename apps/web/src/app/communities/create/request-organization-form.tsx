"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submitOrganizationRequestSchema,
  type SubmitOrganizationRequestInput,
} from "@trainers/validators";
import type { SocialLinkPlatform } from "@trainers/validators";
import { generateSlug } from "@trainers/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PlatformIcon } from "@/components/communities/social-link-icons";
import { submitOrganizationRequestAction } from "@/actions/organization-requests";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const HANDLE_FIELDS = [
  {
    name: "twitter_handle" as const,
    label: "X (Twitter)",
    platform: "twitter" as SocialLinkPlatform,
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:(?:x|twitter)\.com)\/(.+)/i,
  },
  {
    name: "bluesky_handle" as const,
    label: "Bluesky",
    platform: "bluesky" as SocialLinkPlatform,
    placeholder: "handle.bsky.social",
    urlPattern: /(?:https?:\/\/)?bsky\.app\/profile\/(.+)/i,
  },
  {
    name: "instagram_handle" as const,
    label: "Instagram",
    platform: "instagram" as SocialLinkPlatform,
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(.+)/i,
  },
  {
    name: "youtube_handle" as const,
    label: "YouTube",
    platform: "youtube" as SocialLinkPlatform,
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@?(.+)/i,
  },
  {
    name: "twitch_handle" as const,
    label: "Twitch",
    platform: "twitch" as SocialLinkPlatform,
    placeholder: "handle",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(.+)/i,
  },
];

export function RequestOrganizationForm() {
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
    const result = await submitOrganizationRequestAction({
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        {/* Section 1: About your community */}
        <section className="space-y-4">
          <div className="border-primary/20 border-b pb-2">
            <h2 className="text-primary text-sm font-medium">
              About your community
            </h2>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Community Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="My Community"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                {name && (
                  <FormDescription>
                    trainers.gg/communities/{generateSlug(name)}
                  </FormDescription>
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about your community — what events do you run, who do you serve?"
                    disabled={isSubmitting}
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Help us understand your community so we can review your
                  request
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Section 2: Community links */}
        <section className="space-y-4">
          <div className="border-primary/20 border-b pb-2">
            <h2 className="text-primary text-sm font-medium">
              Community links
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              These will be displayed on your community&apos;s profile page and
              can be edited later.
            </p>
          </div>

          {/* Discord invite code */}
          <FormField
            control={form.control}
            name="discord_invite_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Discord Server Invite</FormLabel>
                <div className="flex items-center">
                  <span className="bg-muted text-muted-foreground flex h-9 w-36 shrink-0 items-center gap-2 rounded-l-md border border-r-0 px-3 text-sm">
                    <PlatformIcon
                      platform="discord"
                      className="text-primary h-4 w-4 shrink-0"
                    />
                    Discord
                    <span className="text-destructive">*</span>
                  </span>
                  <FormControl>
                    <Input
                      placeholder="invite-code"
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
                <FormDescription>
                  Paste an invite link or just the code — we&apos;ll handle the
                  rest
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Handle-based social links */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Link any other social accounts your community uses. Follower count
              does not matter — we just want to get to know you.
            </p>

            <div className="grid grid-cols-1 gap-3">
              {HANDLE_FIELDS.map((social) => (
                <FormField
                  key={social.name}
                  control={form.control}
                  name={social.name}
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="sr-only">{social.label}</FormLabel>
                      <div className="flex items-center">
                        <span className="bg-muted text-muted-foreground flex h-9 w-36 shrink-0 items-center gap-2 rounded-l-md border border-r-0 px-3 text-sm">
                          <PlatformIcon
                            platform={social.platform}
                            className="text-primary h-4 w-4 shrink-0"
                          />
                          {social.label}
                        </span>
                        <FormControl>
                          <Input
                            placeholder={social.placeholder}
                            disabled={isSubmitting}
                            className="rounded-l-none"
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

              {/* Other — full URL */}
              <FormField
                control={form.control}
                name="other_url"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="sr-only">Other</FormLabel>
                    <div className="flex items-center">
                      <span className="bg-muted text-muted-foreground flex h-9 w-36 shrink-0 items-center gap-2 rounded-l-md border border-r-0 px-3 text-sm">
                        <PlatformIcon
                          platform="website"
                          className="text-primary h-4 w-4 shrink-0"
                        />
                        Other
                      </span>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          disabled={isSubmitting}
                          className="rounded-l-none"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </form>
    </Form>
  );
}
